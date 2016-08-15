// Insert contract address logged by uploadContract()
var contractAddress = '0xca83b77aa8666cb580f6fe8a1040424f7883a672'
// Compiled contract
var contractCompiled
// Contract on blockchain
var contractInstance
var contractEvents
const NumPirates = 5

function updateEvent(events) {
  // Reset visibility (Hide all dialogs).
  for (let dialogName of ["Join","Propose","Wait","Vote", "Dead", "Payout"]) {
    document.getElementById("dialog"+dialogName).style.setProperty("display","none")
  }
  // Reset split proposal field properties
  for (i=0;i<NumPirates;i++){
    el = document.getElementById("coins"+i)
    el.readonly = true
    el.style.setProperty("border","2px solid #AAA")
    el.oninput = null
  }
  
  // Delete history
  document.getElementById("history").innerHTML = "";
  
  // Evaluate all events
  round = 0
  id = -1
  joined = 0
  finished = false
  for (let event of events) {
    switch (event.event) {
      case "EventStarted":
	price = web3.fromWei(event.args.Price,"ether")
	addHistory("Game started. The total reward is "+price.toString()+" ETH.")
	break
      case "EventJoined":
	text = event.args.Pirate.slice(0,10)
	if (event.args.Pirate==web3.eth.defaultAccount) {
	  text = "<span style=\"color: #F70; font-weight: bold;\" >You</span>"
	  id = joined
	}
	document.getElementById("addr"+joined).innerHTML = text
	joined++
	break
      case "EventProposed":
	split = event.args.Proposal
	votes = []
	votes[round]=true
	split = [100].concat(split)
        for (i=1;i<split.length;i++){
	  split[i]=split[i].toNumber()
	  split[0]-=split[i]
	}
	addHistory("The captain proposed the following split: "+split+".")
	break
      case "EventDecision":
	if (event.args.Accepted) {
	  finished = true
	  addHistory("The split was accepted.")
	} else {
	  delete split
	  delete votes
	  round++
	  addHistory("The split was rejected. The first mate was promoted to captain.")
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
      text = "Pirate "+(i-round-1)
    }
    document.getElementById("img"+i).setAttribute("src",fn)
    document.getElementById("rank"+i).innerHTML = text
  }
  // If there are empty spots and the user has not joined yet, display the joining dialog
  if (joined<NumPirates  && id == -1) {
    document.getElementById("dialogJoin").style.removeProperty("display")
  }
  // If user is a dead pirate display message
  if ( 0 <= id && id < round) {
    document.getElementById("dialogDead").style.removeProperty("display")
  }
  // Display split if it is defined
  if (typeof split !== 'undefined') {
    // There is a split proposal. Fill in the values.
    sum = 0
    for (i=0;i<NumPirates;i++){
      value = ""
      if (i >= round) {
	value = split[i-round]
      }
      document.getElementById("coins"+i).value=value
    }
  }
  // Check if in voting phase
  if (typeof votes !== 'undefined') {
    // Voting phase, display votes
    for (i=0;i<NumPirates;i++){
      text=""
      if (votes[i]===true) {
        text="<span style=\"color: #00AA00\">&#x2714;</span>"
      } else if (votes[i]===false) {
        text="<span style=\"color: #AA0000\">&#x2718;</span>"
      }
      document.getElementById("vote"+i).innerHTML=text
    }
    // Show voting dialog if the user can vote and game did not finish yet
    if (id > round && votes[id]===undefined && !finished) {
      document.getElementById("dialogVote").style.removeProperty("display")
      document.getElementById("acceptButton").onclick=function(){sendVote(round,true)}
      document.getElementById("rejectButton").onclick=function(){sendVote(round,false)}
    }
  } else {
    // Not in voting phase, erase votes
    for (i=0;i<NumPirates;i++){
      el = document.getElementById("vote"+i).innerHTML=""
    }
  }
  // Check if in proposal phase
  if (typeof split === "undefined") {
    // Proposal phase (there is no split proposal yet)
    // Check if the user is the captain.
    if (id === round) {
      // User is captain. Display proposal dialog and unlock split editing
      document.getElementById("dialogPropose").style.removeProperty("display")
      allEmpty = true
      for (i=id+1;i<NumPirates;i++){
	el = document.getElementById("coins"+i)
	el.readOnly=false
	el.style.setProperty("border","2px solid #0A0")
	allEmpty = allEmpty && (el.value == "")
      }
      // If all split inputs are empty fill them with 100, 0, ...
      if (allEmpty) {
	document.getElementById("coins"+id).value = 100
	for (i=id+1;i<NumPirates;i++){
	  document.getElementById("coins"+i).value = 0
	}
      }
      // Add onchange function that automatically adjusts the captains share
      for (i=id+1;i<NumPirates;i++){
	document.getElementById("coins"+i).oninput = function(){
	  sum = 0
	  for (i=id+1;i<NumPirates;i++){
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
  // Check if game finished
  if (finished && id >= round) {
    
    document.getElementById("dialogPayout").style.removeProperty("display")
    share = price.mul(split[id-round]/100.0).toString()
    console.log(split[id-round]/100.0)
    document.getElementById("buttonPayout").value = "Get reward ("+share+" ETH)"
  }
}

function addHistory(message) {
  item = document.createElement("li")
  item.innerHTML = message
  hist = document.getElementById("history")
  hist.insertBefore(item, hist.firstChild)
}

function sendVote(round,vote) {
  try {
    contractInstance.Vote(round,vote)
  }
  catch(e) {
    log(false,"Error sending Vote("+round+","+vote+")",e.message)
    return
  }
  log(true,"Sent Vote("+vote+")")
}

function sendPayout() {
  try {
    contractInstance.Payout()
    return
  }
  catch(e) {
    log(false,"Error sending Payout()",e.message)
  }
  log(true,"Sent Payout()")
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
  for (i=id+1;i<NumPirates;i++) {
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
    return
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


window.onload = function () {
  if (web3.eth.accounts.length===0) {
    alert("No account set. Please set an account.")
    return
  } else if (web3.eth.accounts.length===1) {
    web3.eth.defaultAccount=web3.eth.accounts[0]
  } else {
    alert("Multiple accounts set. Please set only one account.")
    return
  }
  
  // Compile contract and show errors
  try {
    contractCompiled = web3.eth.compile.solidity(contractSource)
  }
  catch(e) {
    log(false, "Compilation error", e.message)
    return
  }
  log(true, "Compiled contract")
  
  contractInterface = web3.eth.contract(JSON.parse(contractCompiled.Game.interface))
  contractInstance = contractInterface.at(contractAddress)
  
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