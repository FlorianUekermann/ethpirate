contractSource=`contract Game {
    address owner;

    function Game() {
      owner = msg.sender;
    }
    
    function Cleanup() {
      if (msg.sender==owner) {
	selfdestruct(owner);
      }
    }
}
`

function uploadContract() {
  //Check if the contract compiled succesfully
  if (contractCompiled===undefined) {
    log(false,"No compiled contract. Can't upload.")
    return
  }
  //Send the creation transaction
  try {
    thash = web3.eth.sendTransaction({data: contractCompiled.Game.bytecode})
  }
  catch (e) {
    log(false,"Sending contract failed",json.Stringify(e))
    return
  }
  log(true,"Created contract","Transaction hash: "+thash+"\nChecking for confirmations...")
  //Check the contract address until it has been confirmed 10 times
  syncing = web3.eth.isSyncing(function() {
    console.log("asdf")
    receipt = web3.eth.getTransactionReceipt(thash)
    if (receipt!==null) {
	conf=web3.eth.blockNumber-receipt.blockNumber
	msg="Contract address: "+receipt.contractAddress
	msg=msg+"\nConfirmations: "+conf+"/10"
	if (conf<10) {
	  msg=msg+"\nKeep checking for confirmations..."
	} else {
	  msg=msg+"\nDone. Write down the last contract address!"
	  syncing.stopWatching()
	}
	log(true,"Contract mined",msg)
    } else {
      log(false,"Contract not yet mined","Keep checking for confirmations...")
    }
  })
  console.log(syncing)
}