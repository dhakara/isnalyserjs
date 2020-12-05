// init reader (to load csv)
var transmissionsReader = new FileReader();  
var transmittersReader = new FileReader();
var stepSize = 15;

// init d3 graphviz object
var graphviz = d3.select("#graph").graphviz();


// init tooltip object and append to div 
var tooltip = d3.select("#graph").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0); // init invisibly



function loadTransmissionsFile() { 
  /** Get loaded transmissions file and store in reader variable. */
  // load transmissions file   
  var transmissionsFile = document.querySelector('div.transmissions input[type=file]').files[0];   
  // call buildGraph on load
  // transmissionsReader.addEventListener("load", test, false);
  if (transmissionsFile) {
    transmissionsReader.readAsText(transmissionsFile);
  }      
}


function loadTransmittersFile() {
  /** Get loaded transmitters file and store in reader variable. */
  // load transmitters file
  var transmittersFile = document.querySelector('div.transmitters input[type=file]').files[0];   
  // call buildTimeline on load
  // transmittersReader.addEventListener("load", buildTimeline, false);
  if (transmittersFile) {
    transmittersReader.readAsText(transmittersFile);
  }      
}

function getStepSize() {
  /** Get user specified step size and overwrite default value. */
  // get stepsize entered by user
  userStepSize = parseInt(document.getElementById('stepsize').value);   
  if (userStepSize) {
    stepSize = userStepSize;
  }      
}




function abbreviateName(name) {
  if (name.length > 7) {
    console.log('Wow, this is a long name');
    var lastName = name.split(' ').slice(-1).join(' ');
    var shortName = name.substring(0,5) + '... ' + lastName;

    return shortName;

  }
  else{
    return name;
  }
}



function buildTimeline(stepsize) {
  /** Build a timeline subgraph based on stepsize and data. */
  // get data from transmitters table
  var dataTransmitters = d3.csvParse(transmittersReader.result);
  // get min and max of death dates
  var timelineMin = d3.min(dataTransmitters, function(d) { return +d.dAH; })
  var timelineMax = d3.max(dataTransmitters, function(d) { return +d.dAH; })
  // init timeline subgraph
  var timeline = [' subgraph {'];
  timeline.push( ' node [shape=none]');
  // init timeline as empty list
  var timelineList = [];
  // append new nodes to timeline according to stepsize
  for (var i = timelineMin; i < timelineMax;) {
      timeline.push(' ' + i.toString()  + '->' + (i+stepsize).toString() + ' [penwidth = 3, arrowhead = None]');
      timelineList.push(i); // also have a list of timeline values
      i = i+stepsize;
  }
  // complete timeline subgraph
  timeline.push('}');

  return [timeline, timelineList];

}

function buildGraph(timeline, constraints) {
  /** Based one timeline, constraints and data, build graph as list of dot commands. */
  // get data from loaded files
  var dataTransmitters = d3.csvParse(transmittersReader.result);
  var dataTransmissions = d3.csvParse(transmissionsReader.result);
  // init dot source
  var dot = ['strict digraph  { '];
  // dot.push(' node [style="filled"]');
  // add nodes
  dataTransmitters.forEach((item,i) =>
      dot.push(' ' + '"'+item.Transmitters+'"')
      );
  // add timeline
  dot = dot.concat(timeline);
  // add constraints
  dot = dot.concat(constraints);
  // add connections
  dataTransmissions.forEach((item,i) =>
      dot.push(' ' +'"'+ item.From +'"'+ ' -> ' + '"'+item.To+'"') // hyphens are necessary
      );
  // and complete it
  dot.push('}');

  return [dot];

}



function isWithinRange(dAH, transmitter, year, stepsize) {
  /** Return transmitter if its death date lies in the range given by year and stepsize.*/
  if (year <= dAH && dAH < (year+stepsize)) { // check if within range
    return '"' + transmitter + '"'; // and return formated transmitter string if so
  }
}



function matchToTimeline() {
  /** Get constraints to place transmitters in timeline according to their death data (dAH) */
  var timeline = buildTimeline(stepSize)[1]; // get timeline as list
  var dataTransmitters = d3.csvParse(transmittersReader.result); // get loaded transmitters file
  var constraints = []; // init the constraints we want to return as empty list
  // iterate over years of our timeline
  for (var i = 0; i < timeline.length; i++) {
    // list to place in the nodes that will correspond to the current timeline year
    let closestList = [];
    // init rank constraint string
    let constraintString = '{ rank=same ' + timeline[i];
    // iterate over all of our transmitters and get them if they match the current timeline year
    for (var j = 0; j < dataTransmitters.length; j++) {
      closest = isWithinRange(dataTransmitters[j].dAH, dataTransmitters[j].Transmitters, timeline[i], stepSize);
      if (closest){
        constraintString += ' '+closest;
      }
    }
    // complete the rank constraint
    constraintString += ' }'; 
    // and append to our list of constraints
    constraints.push(constraintString);
  }

  return constraints
}



function getDAH(data, key) {
  /** Get death date of a transmitter. */
  for (var i = 0; i < data.length; i++) {
    if (data[i]['Transmitters'] == key) {
      return data[i]['dAH'];
    }
  }
}



function getOrigin(data, key) {
  /** Get origin of a transmitter. */
  for (var i = 0; i < data.length; i++) {
    if (data[i]['Transmitters'] == key) {
      if (data[i]['Origin'] !== undefined){
        return data[i]['Origin'];
      }
      else{
        return " ";
      }
    }
  }
}



function displayNodeTooltip() {
  /** When mouse hovers over a node, display a tooltip with additional information. */
  // select all d3 nodes in the canvas
  nodes = d3.selectAll('.node'); //,.edge 
  // load transmitters data
  var dataTransmitters = d3.csvParse(transmittersReader.result);
  // when mouse is on a node
  nodes
    .on("mouseover", function (d) {
      tooltip.html(d)
        // display summarizing data in tooltip
        .text(
          d.key + "\n"
          + "Year of death: " + getDAH(dataTransmitters, d.key) + "\n"
          + "City of origin: " + getOrigin(dataTransmitters, d.key)) 
        // increase opacity of element
        .style("opacity", 0.9)
        // place element where the event happend
        .style("left", (d3.event.pageX + 15) + "px") 
        .style("top", (d3.event.pageY - 10) + "px"); 
  // When mouse is not one a node
  nodes
    .on("mouseout", function() {
      tooltip.style("opacity", 0); // reduce opacity of element
    });    
  });
}



function renderGraph() {
  /** Build a complete graph with timeline and constraints and render it. */
  // get timeline as list of strings
  var timeline = buildTimeline(stepSize)[0];
  // get constraints as list of strings
  var constraints = matchToTimeline()
  // get main graph as list of constraints
  var dot = buildGraph(timeline, constraints);
  // TODO make adaptive
  graphviz.width(1000);
  graphviz.height(1500);
  // turn list of dot commands into string
  var dotLines = dot[0 % dot.length];
  var dotString = dotLines.join('');
  // var dotString = 'graph { node [style="filled" tooltip=" "]"Long Name" [label="A"]  B  C[label=<<font color="red"><b>C</b></font>>]          "Long Name"--B[label="some text" style=dashed, color=grey]}'

  console.log(dotString);

  // render graph in canvas
  graphviz
      .dot(dotString)
      .render()
      .on("end", displayNodeTooltip) // display tooltips interactively, once graph is rendered
      ;

}



function ttest() {
  // var dot = buildGraph(timeline, constraints);
  // TODO make adaptive
  graphviz.width(1000);
  graphviz.height(1500);
  // turn list of dot commands into string
  // var dotLines = dot[0 % dot.length];
  // var dotString = dotLines.join('');
  var dotString = 'graph {"Long Name" [label="A"]  B[tooltip="origin\ndAH\nbio"]  C[label=<<font color="red"><b>C</b></font>>]          "Long Name"--B[label="some text" style=dashed, color=grey]}'
  // console.log(dotString);

  // render graph in canvas
  graphviz
      .dot(dotString)
      .render();
}







function test(){
  /** placeholder function for buttons... */
    // console.log('working...');
    abbreviateName('Ḥarmalah b. Yaḥyā al-Tugībī');

}
