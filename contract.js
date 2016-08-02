contractSource=`contract Game {
  address[5] Pirates;
  int8[5] Votes;
  uint8 Round;
  uint8[5] Proposal;
  
  // Add senders address to list of pirates.
  function Join() {
    // Check all positions
    for (uint8 i=0; i<Pirates.length; i++) {
      // Check if this position is available.
      if (Pirates[i]==0) {
	// Let the sender join
	Pirates[i]=msg.sender;
	EventJoined(msg.sender);
	return;
      }
      // Check if the sender already has this position.
      if (Pirates[i]==msg.sender) { return; }
    }
  }
  event EventJoined(address Pirate);
  
  // Process a split proposal. The elements of the split
  // argument represent the amount of treasure the captain
  // wants to share with the other pirates in order of rank.
  function ProposeSplit(uint8[] split) {
    // Check if there is already a proposal
    for (uint8 i=0; i<Proposal.length; i++) {
      if (Proposal[i]!=0) { return; }
    }
    // Check if the sender is currently captain.
    if (msg.sender!=Pirates[Round]) { return; }
    // Check if the number of elements in the split matches
    // the number of other pirates that are still alive.
    if (split.length!=Pirates.length-Round-1) { return; }
    // Check if the proposal distributes too much treasure.
    uint16 sum;
    for (i=0; i<split.length; i++) {
      sum += split[i];
    }
    if (sum > 100) { return; }
    // The proposal is valid.
    Proposal[Round]=uint8(100-sum);
    for (i=0; i<split.length; i++) {
      Proposal[Round+1+i]=split[i];
    }
    Votes[Round]=1;
    EventProposed(split);
    //Check if the decision is settled without a vote
    Decide();
  }
  event EventProposed(uint8[] Proposal);
  
  // Process a vote. True means voting for acceptance.
  function Vote(uint8 round, bool vote) {
      // Check if the round matches
      if (Round!=round) { return; }
      // Check if there is a vote in progress
      if (Votes[Round]==0) { return; }
      // Check if the sender is a pirate who can vote
      uint8 senderIdx = 0;
      for (uint8 i=Round+1; i<Pirates.length; i++) {
        if (Pirates[i]==msg.sender) { senderIdx=i; break; }
      }
      if (senderIdx==0) { return; }
      // Check if the pirate has voted already
      if (Votes[senderIdx]!=0) { return; }
      // The vote is valid.
      if (vote==true) {
        Votes[senderIdx]=1;
      } else {
        Votes[senderIdx]=-1;
      }
      EventVote(senderIdx, vote);
      //Check if this vote settles the decision
      Decide();
  }
  event EventVote(uint8 Voter, bool Vote);
  
  // Check if the proposal was accepted or declined
  function Decide() {
      // Sum the casted votes and count how many are missing
      int8 sum = 0;
      int8 missing = 0;
      for (uint8 i=0; i<Pirates.length; i++) {
          sum += Votes[i];
          if (Votes[i]==0) { missing++; }
      }
      // Check if the casted votes allow a decision.
      if (sum-missing >= 0) {
        // The proposal was accepted. End the game.
        EventDecision(true);
        for (i=0; i<Pirates.length; i++) {
            Votes[i]=0;
        }
      } else if (sum+missing < 0) {
        // The proposal was declined. Start next round.
        EventDecision(false);
        Round++;
        for (i=0; i<Pirates.length; i++) {
            Proposal[i]=0;
            Votes[i]=0;
        }
      }
  }
  event EventDecision(bool Accepted);
  
  function Payout() {
    // Check which pirate the sender is
    uint8 senderIdx = 0;
    bool found = false;
    for (uint8 i=0; i<Pirates.length; i++) {
      if (Pirates[i]==msg.sender) {
	senderIdx=i;
	found=true;
	break;
      }
    }
    // Send money if sender was found
    if (!found) { return; }
    uint share = (price/100)*Proposal[senderIdx];
    Proposal[senderIdx] = 0;
    if (!msg.sender.send(share)) {
      throw;
    }
  }
  
  address owner;
  uint price;
  function Game() {
    owner = msg.sender;
    price = msg.value;
    EventStarted();
  }
  event EventStarted();
    
  function Cleanup() {
    if (msg.sender==owner) {
      selfdestruct(owner);
    }
  }
}
`

function uploadContract(value) {
  if (value===undefined) {
    log(false,"No value as price money provided. Can't upload.")
    return
  }
  //Check if the contract compiled succesfully
  if (contractCompiled===undefined) {
    log(false,"No compiled contract. Can't upload.")
    return
  }
  //Send the creation transaction
  try {
    thash = web3.eth.sendTransaction({data: contractCompiled.Game.bytecode, value: web3.toWei(value)})
  }
  catch (e) {
    log(false,"Sending contract failed",JSON.stringify(e))
    return
  }
  log(true,"Created contract","Transaction hash: "+thash+"\nChecking for confirmations...")
  //Check the contract address until it has been confirmed 10 times
  filter = web3.eth.filter('latest').watch(function() {
    receipt = web3.eth.getTransactionReceipt(thash)
    if (receipt!==null) {
	conf=web3.eth.blockNumber-receipt.blockNumber
	msg="Contract address: "+receipt.contractAddress
	msg=msg+"\nConfirmations: "+conf+"/10"
	if (conf<10) {
	  msg=msg+"\nKeep checking for confirmations..."
	} else {
	  msg=msg+"\nDone. Write down the last contract address!"
	  filter.stopWatching()
	}
	log(true,"Contract mined",msg)
    } else {
      log(false,"Contract not yet mined","Keep checking for confirmations...")
    }
  })
}