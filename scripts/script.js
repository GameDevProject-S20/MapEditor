var data = {
  nodes: [],
  links: []
};

var margin = { top: 10, right: 30, bottom: 30, left: 60 },
  width = 1000 - margin.left - margin.right,
  height = 800 - margin.top - margin.bottom;

var isSpaceHeld = false;

// Used to generate unique IDs
var id = []
for (let i = 0; i < 1000; i++) {
  id.push(i)
}
var linkId = 0;

const modes = {
  NODE: 'Add Node',
  TOWN: 'Add Town',
  ENCOUNTER: 'Add Encounter',
  LINK: 'Link Nodes',
  DELETE: 'Delete Node',
  UNLINK: 'Unlink Nodes'
}

var mode = modes.NODE;

// Node Linking / Unlinking
var linking = false;
var idOfSource = -1;

document.addEventListener("keydown", event => {
  switch (event.key) {
    case "1":
      mode = modes.NODE;
      break
    case "2":
      mode = modes.TOWN;
      break
    case "3":
      mode = modes.ENCOUNTER;
      break
    case "4":
      mode = modes.LINK;
      linking = false;
      break
    case "5":
      mode = modes.UNLINK;
      linking = false;
      break
    case "6":
      mode = modes.DELETE;
      break
    case " ":
      isSpaceHeld = true;
      $("#canvas").css('cursor', 'move')
      break
    case "Escape":
      linking = false;
      break
  }
  $("#mode").text(mode)
});

document.addEventListener("keyup", event => {
  if (event.key == " ") {
    isSpaceHeld = false;
    $("#canvas").css('cursor', '')
  }

});


// Stop context menu from showing on rightclick
document.addEventListener("contextmenu", event => {
  event.preventDefault();
})

/* -------------------------------------------------------------------------- */
/*                                     D3                                     */
/* -------------------------------------------------------------------------- */

// Add SVG canvas
var SVG = d3.select("#canvas")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform",
    "translate(" + margin.left + "," + margin.top + ")");

// Add X axis
var x = d3.scaleLinear()
  .domain([0, 10])
  .range([0, width]);
var xAxis = SVG.append("g")
  .attr("transform", "translate(0," + height + ")")
  .call(d3.axisBottom(x));
var xAxisScale = d3.axisBottom(x);

// Add Y axis
var y = d3.scaleLinear()
  .domain([0, 10])
  .range([height, 0]);
var yAxis = SVG.append("g")
  .call(d3.axisLeft(y));
var yAxisScale = d3.axisLeft(y);

// Zoom & Pan Behaviour
// Only pan when space is held
var zoom = d3.zoom()
  .filter(() => {
    if (d3.event.type != "wheel") {
      return isSpaceHeld;
    }
    return true;
  })
  .scaleExtent([.1, 1])
  .extent([[0, 0], [width, height]])
  .on("zoom", updateScale);

// Rect to hand zoom events
var zoomLayer = SVG.append("rect")
  .attr("width", width)
  .attr("height", height)
  .style("fill", "none")
  .style("pointer-events", "all")
  .attr('transform', 'translate(' + 0 + ',' + 0 + ')')
  .call(zoom)
  .on("click", mousedownCanvas)

// Reference to containers for nodes & links
var nodes = SVG.append('g')
var links = SVG.append('g')

// add the X gridlines
let xGrid = SVG.append("g")
  .attr('class', 'grid')
  .attr("id", "grid")
  .attr("transform", "translate(0," + height + ")")
  .call(d3.axisBottom(x)
    .ticks(20)
    .tickSize(-height)
    .tickFormat("")
  )

// add the X gridlines
let yGrid = SVG.append("g")
  .attr('class', 'grid')
  .attr("id", "grid")
  .attr("transform", "translate(0," + 0 + ")")
  .call(d3.axisLeft(y)
    .ticks(20)
    .tickSize(-width)
    .tickFormat("")
  )

// Get next valid node ID
function getNextId() {
  for (let i = 0; i < id.length; i++) {
    if (id[i] != -1) {
      id[i] = -1
      return i;
    }
  }
}

// Create a new node on click
function mousedownCanvas() {
  d3.event.preventDefault();
  if (mode == modes.TOWN || mode == modes.NODE || mode == modes.ENCOUNTER) {
    var point = d3.mouse(this),
      node = {
        id: getNextId(),
        name: "node",
        type: (mode == modes.TOWN ? "TOWN" : (mode == modes.NODE ? "NONE" : "EVENT")),
        x: xAxisScale.scale().invert(point[0]),
        y: yAxisScale.scale().invert(point[1])
      }
    node.name += node.id;
    data.nodes.push(node);
    updateChart();
  }
}

// Handle clicking on nodes based off current mode
function mousedownNode(d) {
  d3.event.stopPropagation();

  // on left click
  if (d3.event.button == 0) {

    // DELETE mode: Delete node & and edges containing it
    if (mode == modes.DELETE) {
      for (let index = 0; index < data.nodes.length; index++) {
        if (data.nodes[index].id == d.id) {
          data.nodes.splice(index, 1);
          id[d.id] = d.id;
          for (let j = 0; j < data.links.length; j++) {
            if (data.links[j].source == d.id || data.links[j].target == d.id) {
              data.links.splice(j, 1);
              j--
            }
          }
          break;
        }
      }

    }

    //LINK mode: Select two nodes to form a link
    if (mode == modes.LINK) {
      if (linking) {
        if (d.id == idOfSource) {
          return
        }
        for (let index = 0; index < data.links.length; index++) {
          if (isInEdge(index, d.id)) {
            return
          }
        }
        linking = false;
        data.links.push({ id: linkId++, source: idOfSource, target: d.id });
        idOfSource = -1;
      }
      else {
        linking = true;
        idOfSource = d.id;
      }
    }

    //UNLINK mode: Select two nodes to remove any link between them
    if (mode == modes.UNLINK) {
      if (linking) {
        linking = false;
        for (let index = 0; index < data.links.length; index++) {
          if (isInEdge(index, d.id)) {
            data.links.splice(index, 1);
            break;
          }
        }
        idOfSource = -1;
      }
      else {
        linking = true;
        idOfSource = d.id;
      }
    }

  }

  // on right click
  if (d3.event.button == 2) {
    //console.log("right");
  }

  updateChart();
}

// Return TRUE is node with id is in edge at index i
function isInEdge(i, id) {
  return ((data.links[i].source == idOfSource && data.links[i].target == id)
    || (data.links[i].source == id && data.links[i].target == idOfSource))
}

// Update scale and resize images on zoom/pan
function updateScale() {

  // recover the new scale
  var newX = d3.event.transform.rescaleX(x);
  var newY = d3.event.transform.rescaleY(y);

  // update axes with these new boundaries
  xAxisScale = d3.axisBottom(newX)
  yAxisScale = d3.axisLeft(newY)
  xAxis.call(xAxisScale)
  yAxis.call(yAxisScale)

  // resize nodes using new scale
  nodes
    .selectAll("circle")
    .attr('cx', function (d) { return newX(d.x) })
    .attr('cy', function (d) { return newY(d.y) });

  // resize edges using new scale
  links
    .selectAll(".link")
    .attr("x1", function (l) {
      var sourceNode = data.nodes.filter(function (d) {
        return d.id == l.source
      })[0];
      d3.select(this).attr("y1", yAxisScale.scale()(sourceNode.y));
      return xAxisScale.scale()(sourceNode.x)
    })
    .attr("x2", function (l) {
      var targetNode = data.nodes.filter(function (d) {
        return d.id == l.target
      })[0];
      d3.select(this).attr("y2", yAxisScale.scale()(targetNode.y));
      return xAxisScale.scale()(targetNode.x)
    })

  // resize grid lines using new scale
  xGrid.call(
    d3.axisBottom(x)
      .scale(newX)
      .ticks(20)
      .tickSize(-height)
      .tickFormat("")
  )

  yGrid.call(
    d3.axisLeft(y)
      .scale(newY)
      .ticks(20)
      .tickSize(-width)
      .tickFormat("")
  )
}

// draw nodes & edges based off new data
function updateChart() {
  var n = nodes.selectAll("circle")
    .data(data.nodes, function (d) {
      return d.id;
    })

  n.exit()
    .remove()

  n.enter()
    .append("circle")
    .attr("cx", function (d) { return xAxisScale.scale()(d.x); })
    .attr("cy", function (d) { return yAxisScale.scale()(d.y); })
    .attr("r", 5)
    .attr("fill", function (d) {
      if (d.type == "TOWN") {
        return "red"
      }
      else if (d.type == "NONE") {
        return "blue"
      }
      else {
        return "green"
      }
    })
    .attr("id", function (d) {
      return d.id
    })
    .attr("class", "node")
    .on("mousedown", function (d) {
      mousedownNode(d)
    })

  var e = links.selectAll(".link")
    .data(data.links, function (d) {
      return d.id;
    })

  e.exit()
    .remove()

  e.enter()
    .append("line")
    .attr("class", "link")
    .attr("x1", function (l) {
      var sourceNode = data.nodes.filter(function (d) {
        return d.id == l.source
      })[0];
      d3.select(this).attr("y1", yAxisScale.scale()(sourceNode.y));
      return xAxisScale.scale()(sourceNode.x)
    })
    .attr("x2", function (l) {
      var targetNode = data.nodes.filter(function (d) {
        return d.id == l.target
      })[0];
      d3.select(this).attr("y2", yAxisScale.scale()(targetNode.y));
      return xAxisScale.scale()(targetNode.x)
    })
    .attr("id", function (d) {
      return d.id
    })
    .attr("fill", "none")
    .attr("stroke", "black")
}

updateChart()

/* -------------------------------------------------------------------------- */
/*                                     CSV                                    */
/* -------------------------------------------------------------------------- */


function loadCsv() {
  data.nodes.length = 0;
  data.links.length = 0;
  linkId = 0
  for (var i = 0; i < 1000; i++) {
    id[i] = i;
  }

  var nodesfilesList = document.getElementById("nodesCsv").files;
  if (nodesfilesList.length == 0) return;
  var nodesFile = nodesfilesList[0]

  var edgesfilesList = document.getElementById("edgesCsv").files;
  if (edgesfilesList.length == 0) return;
  var edgesFile = edgesfilesList[0]

  var fr1 = new FileReader()
  var fr2 = new FileReader()

  fr1.onloadend = () => { parseNodesCsv(fr1.result) };
  fr1.readAsText(nodesFile);

  fr2.onloadend = () => { parseEdgesCsv(fr2.result) };
  fr2.readAsText(edgesFile);
}

function parseNodesCsv(csvData) {
  $.csv.toObjects(csvData, function (err, result) {
    for (const d of result) {
      let n = { id: +d.Id, name: d.Name, type: d.Type, x: +d.PosX, y: +d.PosY }
      id[n.id] = -1;
      data.nodes.push(n)
    }
  })
  updateChart()
}

function parseEdgesCsv(csvData) {
  $.csv.toObjects(csvData, function (err, result) {
    for (const d of result) {
      let l = { id: +linkId++, source: +d.idOfSource, target: +d.idOfTarget }
      data.links.push(l)
    }
  })

  updateChart()
}

function writeCsv() {
  var nodes_CsvFormat = []
  for (const node of data.nodes) {
    let n = { Id: node.id, Name: node.name, Type: node.type, PosX: node.x, PosY: node.y }
    nodes_CsvFormat.push(n)
  }

  $.csv.fromObjects(nodes_CsvFormat, function (err, result) {
    downloadFile("MapNodes.csv", result)
  })

  var edges_CsvFormat = []
  for (const edge of data.links) {
    let e = { idOfSource: edge.source, idOfTarget: edge.target }
    edges_CsvFormat.push(e)
  }

  $.csv.fromObjects(edges_CsvFormat, function (err, result) {
    downloadFile("MapEdges.csv", result)
  })

}

function downloadFile(fileName, csvContent) {
  var encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
  var link = document.createElement("a");
  link.href = encodedUri
  link.download = fileName
  link.click();
}