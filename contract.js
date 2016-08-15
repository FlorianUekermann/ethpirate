contractSource=`contract Game {
  address[5] Pirates;
  int8[5] Votes;
  uint Round;
  uint8[5] Proposal;
  bool[5] Payed;
  
  // Add senders address to list of pirates.
  function Join() {
    // Check that game hasn't ended
    if (GameEnded()) { return; }
    // Check if sender is already a pirate
    if (PlayerIdx() != -1) { return; }
    // Find first free slot
    int free = -1;
    for (uint i=0; i<Pirates.length; i++) {
      if (Pirates[i]==0) { free = int(i); break; }
    }
    // Join player if a free slot was found
    if (free == -1)  { return; }
	Pirates[uint(free)]=msg.sender;
	EventJoined(msg.sender);
  }
  event EventJoined(address Pirate);
  
  // Process a split proposal. The elements of the split
  // argument represent the amount of treasure the captain
  // wants to share with the other pirates in order of rank.
  function ProposeSplit(uint8[] split) {
    // Check if game is in proposal phase
    if (!ProposalPhase()) { return; }
    // Check if the sender is currently captain.
    if (Rank() != RankCaptain) { return; }
    // Check if the number of elements in the split matches
    // the number of other pirates that are still alive.
    if (split.length!=Pirates.length-Round-1) { return; }
    // Check if the proposal distributes too much treasure.
    uint16 sum;
    for (uint8 i=0; i<split.length; i++) {
      sum += split[i];
    }
    if (sum > 100) { return; }
    // Calculate and store the captains share
    Proposal[Round]=uint8(100-sum);
    // Store other pirates share
    for (i=0; i<split.length; i++) {
      Proposal[Round+1+i]=split[i];
    }
    // Set captains vote
    Votes[Round]=1;
    EventProposed(split);
    //Check if the decision is settled without a vote
    Decide();
  }
  event EventProposed(uint8[] Proposal);
  
  // Process a vote. True means voting for acceptance.
  // The round is specified to ensure that the vote is not
  // a transaction from last round that arrived too late.
  function Vote(uint8 round, bool vote) {
      // Check if the round matches
      if (Round!=round) { return; }
      // Check if there is a vote in progress
      if (!VotingPhase()) { return; }
      // Check if the sender is a pirate who can vote
      if (Rank() != RankPirate) { return; }
      // Check if the pirate has voted already
      uint senderIdx = uint(PlayerIdx());
      if (Votes[senderIdx]!=0) { return; }
      // Store the vote
      if (vote==true) {
        Votes[senderIdx]=1;
      } else {
        Votes[senderIdx]=-1;
      }
      EventVote(senderIdx, vote);
      //Check if this vote settles the decision
      Decide();
  }
  event EventVote(uint Voter, bool Vote);
  
  // Check if the proposal was accepted or declined
  function Decide() {
      // Sum the votes and count how many are missing
      int sum = 0;
      int missing = 0;
      for (uint i=Round; i<Pirates.length; i++) {
          sum += Votes[i];
          if (Votes[i]==0) { missing++; }
      }
      // Check if the casted votes allow a decision.
      if (sum-missing >= 0) {
        // The proposal was accepted.
        EventDecision(true);
        // End voting phase by zeroing votes.
        // End game by leaving proposal unchanged
        // (Zeroing would start proposal phase).
        for (i=0; i<Pirates.length; i++) {
           Votes[i]=0;
        }
      } else if (sum+missing < 0) {
        // The proposal was declined.
        EventDecision(false);
        // Increment round counter
        Round++;
        // Start proposal phase by zeroing proposal.
        // End voting phase by zeroing votes
        for (i=0; i<Pirates.length; i++) {
            Proposal[i]=0;
            Votes[i]=0;
        }
      }
  }
  event EventDecision(bool Accepted);
  
  // Check if game has ended. The game has ended if it is
  // neither in voting or proposal phase.
  function GameEnded() private returns (bool) {
      return !ProposalPhase() && !VotingPhase();
  }
  
  // Check if the game is waiting for proposal.
  // This is true if all elements of "Proposal" are zero.
  function ProposalPhase() private returns (bool) {
    for (uint8 i=0; i<Proposal.length; i++) {
      if (Proposal[i]!=0) { return false; }
    }
    return true;
  }
  
  // Check if game is waiting for votes.
  // This is true if at least one element of Votes is non-zero.
  function VotingPhase() private returns (bool) {
    for (uint8 i=0; i<Votes.length; i++) {
      if (Votes[i]!=0) { return true; }
    }
    return false;
  }
  
  // Returns the player index of the sender.
  // Returns -1 if the sender has not joined the game.
  function PlayerIdx() private returns (int) {
      for (uint i=0; i<Pirates.length; i++) {
        if (Pirates[i]==msg.sender) { return int(i); }
      }
      return -1;
  }
  
  // Returns rank of the pirate. Returns -1 if the player is
  // not a pirate. The ranks are specified by the constant below.
  int constant RankDead = 0;
  int constant RankCaptain = 1;
  int constant RankPirate = 2;
  function Rank() returns (int) {
      int senderIdx = PlayerIdx();
      if (senderIdx == int(Round)) { return RankCaptain; }
      if (senderIdx >=0 && senderIdx < int(Round)) { return RankDead; }
      if (senderIdx >=0 && senderIdx < int(Pirates.length)) { return RankPirate; }
      return -1;
  }
  
  function Payout() {
    // Check if the game ended
    if (!GameEnded()) { return; }
    // Check if sender is a player and hasn't collected his share.
    int senderIdx = PlayerIdx();
    if (senderIdx == -1) { return; }
    // Calculate share
    uint share = (price/100)*Proposal[uint(senderIdx)];
    // Zero address to prevent repeated collection
    Pirates[uint(senderIdx)] = 0;
    if (!msg.sender.send(share)) {
      throw;
    }
  }
  
  address owner;
  uint price;
  function Game() {
    owner = msg.sender;
    price = msg.value;
    EventStarted(price);
  }
  event EventStarted(uint Price);
    
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