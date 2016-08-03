// Insert contract address logged by uploadContract()
var contractAddress = '0x0db334bbf0227ee2ed606c903bb7af02e7f82509'
// Compiled contract
var contractCompiled
// Contract on blockchain
var contractInstance
var contractEvents
const NumPirates = 5

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
  
  // Update once in case no events have been received yet
  updateEvent([])
  // Listen for events
  contractEvents = contractInstance.allEvents({fromBlock: 0, toBlock: 'latest'},function(error,event){
    if (error!==null) {
      log(false, "Event listener error", JSON.stringify(error))
      return
    }
    log(true, "Event", JSON.stringify(event))
    updateEvent(contractEvents.get())
  })
}

function updateEvent(events) {
  // Reset visibility (Hide all dialogs).
  for (let dialogName of ["Join","Propose","Wait","Vote", "Dead"]) {
    document.getElementById("dialog"+dialogName).style.setProperty("display","none")
  }
  // Reset split proposal field properties
  for (i=0;i<NumPirates;i++){
    el = document.getElementById("coins"+i)
    el.readonly = true
    el.style.setProperty("border","2px solid #AAA")
    el.oninput = null
  }
  
  // Evaluate all events
  round = 0
  id = -1
  joined = 0
  finished = false
  for (let event of events) {
    switch (event.event) {
      case "EventJoined":
	text = event.args.Pirate.slice(0,10)
	if (event.args.Pirate==web3.eth.defaultAccount) {
	  text = "<span style=\"color: #F70; font-weight: bold;\" >You</span>"
	  id = addresses.length
	}
	document.getElementById("addr"+joined).innerHTML = text
	joined++
	break
      case "EventProposed":
	split = event.args.Proposal
	votes = []
	votes[round]=true  
	break
      case "EventDecision":
	if (event.args.Accepted) {
	  finished = true
	} else {
	  delete split
	  delete votes
	  round++
	}
	break
      case "EventVote":
	  votes[event.args.Voter]=event.args.Vote
	break 
    }
  }
  // Set pictures and rank text based on round
  for (i=0;i<NumPirates;i++){
    if (i===round) {
      fn = "pirate-captain.svg"
      text = "Captain"
    } else if (i===round+1) {
      fn = "pirate-mate.svg"
      text = "First mate"
    } else if (i<round) {
      fn = "pirate-dead.svg"
      text = "Dead"
    } else {
      fn = "pirate.svg"
      text = "Pirate "+i-round
    }
    document.getElementById("img"+i).setAttribute("src",fn)
    document.getElementById("rank"+i).innerHTML = text
  }
  // If there are empty spots and the user has not joined yet, display the joining dialog
  if (joined<NumPirates  && id == 0) {
    document.getElementById("dialogJoin").style.removeProperty("display")
  }
  // If user is a dead pirate display message
  if ( 0 < id && id < round) {
    document.getElementById("dialogDead").style.removeProperty("display")
  }
  // Display split if it is defined
  if (typeof split !== 'undefined') {
    // There is a split proposal. Fill in the values.
    sum = 0
    for (i=0;i<NumPirates;i++){
      value = ""
      if (i > round) {
	value = split[i-round-1].toNumber()
	sum += value
      }
      document.getElementById("coins"+i).value=value
    }
    document.getElementById("coins"+round).value=100-sum
  }
  
  // Check if in voting phase
  if (typeof votes !== 'undefined') {
    // Voting phase, display votes
  for (i=0;i<NumPirates;i++){
    text=""
    if (votes[i-1]===true) {
      text="<span style=\"color: #00AA00\">&#x2714;</span>"
    } else if (votes[i-1]===false) {
      text="<span style=\"color: #AA0000\">&#x2718;</span>"
    }
    document.getElementById("vote"+i).innerHTML=text
  }
  // Show voting dialog if the user can vote and game did not finish yet
    if (id > round && votes[id-1]===undefined && !finished) {
      document.getElementById("dialogVote").style.removeProperty("display")
    }
  } else {
    // Not in voting phase, erase votes
    for (i=0;i<NumPirates;i++){
      el = document.getElementById("vote"+i).innerHTML=""
    }
  }
  
  // Check if in proposal phase
  if (typeof split !== 'undefined') {
    //Proposal phase (there is no split proposal yet)
    // Check if the user is the captain.
    if (id == round) {
      // User is captain. Display proposal dialog and unlock split editing
      document.getElementById("dialogPropose").style.removeProperty("display")
      allEmpty = true
      for (i=id+1;i<=NumPirates;i++){
	el = document.getElementById("coins"+i)
	el.readOnly=false
	el.style.setProperty("border","2px solid #0A0")
	allEmpty = allEmpty && (el.value == "")
      }
      // If all split inputs are empty fill them with 100, 0, ...
      if (allEmpty) {
	document.getElementById("coins"+id).value = 100
	for (i=id+1;i<=NumPirates;i++){
	  document.getElementById("coins"+i).value = 0
	}
      }
      // Add onchange function that automatically adjusts the captains share
      for (i=id+1;i<=NumPirates;i++){
	document.getElementById("coins"+i).oninput = function(){
	  sum = 0
	  for (i=id+1;i<=NumPirates;i++){
	    sum += document.getElementById("coins"+i).valueAsNumber
	  }
	  document.getElementById("coins"+id).value = 100 - sum
	}
      }
    } else {
      // User joined but is not the captain. Display waiting dialog and display empty split.
      document.getElementById("dialogWait").style.removeProperty("display")
      for (i=0;i<NumPirates;i++){
	document.getElementById("coins"+i).value=""
      }
    }
  }
}

function sendVote(vote) {
  try {
    contractInstance.Vote(vote)
  }
  catch(e) {
    log(false,"Error sending Vote("+vote+")",e.message)
    return
  }
  log(true,"Sent Vote("+vote+")")
}

function sendJoin() {
  try {
    contractInstance.Join()
    return
  }
  catch(e) {
    log(false,"Error sending Join()",e.message)
  }
  log(true,"Sent Join()")
}

function sendProposal() {
  split=[]
  sum = 0
  for (i=id+1;i<=NumPirates;i++) {
    share = document.getElementById("coins"+i).valueAsNumber
    if (share >= 0 && share % 1 === 0) {
      // Value is valid
      sum += share
      split.push(share)
    } else {
      // Invalid value. Display error
      alert("Some values in the split are negative or not whole numbers. Please adjust your proposal")
      return
    }
  }
  if (sum > 100) {
    // Sum exceeds 100.
    alert("You distributed more than 100 coins to your crew. Please adjust your proposal.")
  }
  try {
    contractInstance.ProposeSplit(split)
  }
  catch(e) {
    log(false,"Error sending ProposeSplit(["+split+"])",e.message)
    return
  }
  log(true,"Sent ProposeSplit(["+split+"])")
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