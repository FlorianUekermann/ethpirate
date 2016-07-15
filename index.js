// Insert contract address logged by uploadContract()
var contractAddress = '0x48a4c09be9764220d86c601e9bd9dc423ecd2674'
// Compiled contract
var contractCompiled
// Contract on blockchain
var contractInstance


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
  contractInstance = instance=contractInterface.at(contractAddress)
  
  
}

function updateInterface(error,asdf) {
  //Check error
  if (error!==null) {
    document.getElementById("status").innerHTML="<span style=\"color: #FF0000\">Status: Error</span>"
    log(false,"Error",JSON.stringify(Error))
  }
  
  //Present account information
  if (web3.eth.defaultAccount!==undefined) {
    document.getElementById("account").innerHTML="Account: "+web3.eth.defaultAccount
    document.getElementById("balance").innerHTML="Balance: "+web3.fromWei(web3.eth.getBalance(web3.eth.defaultAccount)).toString()+" ETH"
  }
}

window.onload = function () {
  if (init()!==false) {
    updateInterface(null)
    web3.eth.filter('latest').watch(updateInterface)
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