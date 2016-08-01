// Insert contract address logged by uploadContract()
var contractAddress = '0xde199369fbcc61eceddc4459a9c08151e1ec74d1'
// Compiled contract
var contractCompiled
// Contract on blockchain
var contractInstance
var contractEvents

function init() {
  if (web3.eth.accounts.length===0) {
    document.getElementById("account").innerHTML="No account selected."
    document.getElementById("status").innerHTML="<span style=\"color: #FF0000\">Status: Error</span>"
    return false
  } else if (web3.eth.accounts.length===1) {
    web3.eth.defaultAccount=web3.eth.accounts[0]
  } else {
    document.getElementById("account").innerHTML="Multiple accounts selected."
    document.getElementById("status").innerHTML="<span style=\"color: #FF0000\">Status: Error</span>"
    return false
  }
  
  // Compile contract and show errors
  try {
    contractCompiled = web3.eth.compile.solidity(contractSource)
  }
  catch(e) {
    console.log(e)
    log(false, "Compilation error", e.message)
    return false
  }
  log(true, "Compiled contract")
  
  contractInterface = web3.eth.contract(JSON.parse(contractCompiled.Game.interface))
  contractInstance = contractInterface.at(contractAddress)
  
  // Listen for events
  contractEvents = contractInstance.allEvents({fromBlock: 1400000, toBlock: 'latest'},function(error,event){
    if (error!==null) {
      log(false, "Event listener error", JSON.stringify(error))
      return
    }
    log(true, "Event", JSON.stringify(event))
    updateEvent()
  })
}

function updateEvent() {
  addresses=[]
  round = 0
  
  
  events = contractEvents.get()
  for (let event of events) {
    switch (event.event) {
      case "EventJoined":
	address = event.args.Pirate
	addresses.push(address)
	text = address.slice(0,10)
	if (address==web3.eth.defaultAccount) {
	  text = "You"
	}
	document.getElementById("addr"+addresses.length).innerHTML = text
	break
    }
  }
}

function updateNewBlock(error) {
  //Check error
  if (error!==null) {
    document.getElementById("status").innerHTML="<span style=\"color: #FF0000\">Status: Error</span>"
    log(false,"Error",JSON.stringify(error))
  }
  
  //Present account information
  if (web3.eth.defaultAccount!==undefined) {
    document.getElementById("account").innerHTML="Account: "+web3.eth.defaultAccount
    document.getElementById("balance").innerHTML="Balance: "+web3.fromWei(web3.eth.getBalance(web3.eth.defaultAccount)).toString()+" ETH"
  }
}

window.onload = function () {
  if (init()!==false) {
    updateNewBlock(null)
    web3.eth.filter('latest').watch(updateNewBlock)
  }
}

function log(success, title, message) {
  console.log("LOG:",{Success:success, Title:title, Message:message})
  itemMark = document.createElement("dt")
  itemMsg = document.createElement("dd")
  if (success) {
    itemMark.innerHTML = "<span style=\"color: #00AA00\">&#x2714;</span> "+title
  } else {
    itemMark.innerHTML = "<span style=\"color: #AA0000\">&#x2718;</span> "+title
  }
  if (message!==undefined) {
    itemMsg.innerHTML = "<pre>"+message+"</pre>"
  }
  document.getElementById("log").appendChild(itemMark)
  document.getElementById("log").appendChild(itemMsg)
}