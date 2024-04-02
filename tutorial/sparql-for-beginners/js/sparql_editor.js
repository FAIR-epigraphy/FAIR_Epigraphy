const { DataFactory, Util } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;


var store = new N3.Store();
var allPrefixes = []
const yasgui = new Yasgui(document.getElementById("yasgui"), {
    requestConfig: {
        endpoint: "",
        method: ''
    },
    copyEndpointOnNewTab: false,
    contextMenuContainer: undefined,
    //yasqe: {
    //},
    //yasr: {
    //    "settings": {
    //        "selectedPlugin": "table",
    //        "pluginsConfig": {
    //            pageLength: 10
    //        } 
    //    }
    //}
});

function changeContent(control) {
    let query = control.parentNode.nextElementSibling.innerHTML
    //console.log(query)
    new bootstrap.Popover(control,
        {
            html: true,
            trigger: 'hover',
            placement: 'bottom',
            content: `<pre>${query}<pre>`,
            title: 'Preview query'
        }).show()
}

var labelMaxLength = 15;
var scrollbarMarks;
var textMarks = [];
var changeFromSync = false;
var oldTriples = [];
var newTriples = [];

var state = {
    syntaxCheck: "pending",
    fileIsLoaded: false,
    gh: undefined,
    repo: undefined,
    branch: undefined,
    user: undefined,
    currentFile: undefined
};

var syntaxCheckElements = {
    checker: $("#syntax-check"),
    working: $("#syntax-check-working"),
    pending: $("#syntax-check-pending"),
    passed: $("#syntax-check-passed"),
    failed: $("#syntax-check-failed"),
    off: $("#syntax-check-off")
};

var editor = CodeMirror.fromTextArea(document.getElementById('rdf-turtle-contents'), {
    mode: "turtle",
    autofocus: false,
    lineNumbers: true,
    gutters: ["CodeMirror-linenumbers", "breakpoints"],
    extraKeys: { "Ctrl-Space": "autocomplete" },
});

editor.refresh();

editor.custom = {}; // to pass list of prefixes and names
editor.custom.dynamicNames = {};
editor.custom.prefixes = {};
var dynamicNames = {};

CodeMirror.commands.autocomplete = function (cm) {
    cm.showHint(cm, CodeMirror.hint.turtle, { test: "test" });
};

editor.on("change", function (editor, ch) {
    if (changeFromSync) {
        changeFromSync = false;
        return;
    }

    if (ch.origin == "setValue") {
        oldTriples = [];
        newTriples = [];

        hidden = false;

        clusterIndex = 0;
        clusters = [];
        clusterLevel = 0;
    }

    changeSyntaxCheckState("pending");
});

editor.on("cursorActivity", function (editor) {
    //var lineNumber = editor.getDoc().getCursor().line;
    //var content = editor.getDoc().getLine(lineNumber);
    clearMarks();
});

var clearMarks = function () {
    if (scrollbarMarks != null) {
        scrollbarMarks.clear();
        scrollbarMarks = null;
    }

    textMarks.forEach(function (tm) {
        tm.clear();
    });
    textMarks = [];
}

var changeSyntaxCheckState = function (newState, error, force) {
    if (newState !== state.syntaxCheck && (state.syntaxCheck !== "off" || force === true)) {
        console.log("changeSyntaxCheckState", newState, error, force);
        syntaxCheckElements[state.syntaxCheck].hide();
        state.syntaxCheck = newState;

        if (newState === "failed") {
            var status = syntaxCheckElements[newState].find(".status")
            if (error) {
                if (error.startsWith("Syntax error:")) {
                    status.html(" " + error);
                }
                else {
                    status.html(" Syntax error: " + error);
                }
            }
            else {
                status.html(" Syntax check failed.")
            }
        }

        syntaxCheckElements[newState].show();
    }
};

var makeMarker = function (errorMessage) {
    var marker = document.createElement("div");
    marker.style.color = "#822";
    marker.innerHTML = "●";
    marker.title = errorMessage;
    return marker;
};

var splitIntoNamespaceAndName = function (s) {
    var lastHash = s.id.lastIndexOf("#");
    var lastSlash = s.id.lastIndexOf("/");
    var pos = Math.max(lastHash, lastSlash) + 1;

    return {
        namespace: s.id.substring(0, pos),
        name: s.id.substring(pos)
    };
};

var parserHandler = function (error, triple, prefixes) {
    if (error) {
        /* extract line Number, only consider the end of the string after "line" */
        var errorSubString = error.message.substr(error.message.indexOf("line") + 4);
        var errorLineNumber = parseInt(errorSubString) - 1;

        /* add background color, gutter + tooltip */
        editor.getDoc().addLineClass(errorLineNumber, "wrap", "ErrorLine-background");
        editor.setGutterMarker(errorLineNumber, "breakpoints", makeMarker(error.message));

        changeSyntaxCheckState("failed", error.message);
    }
    else if (triple) {
        newTriples.push(triple);
        store.addQuad(
            triple.subject,
            triple.predicate,
            triple.object,
        )

        var subjectSplit = splitIntoNamespaceAndName(triple.subject);
        var predicateSplit = splitIntoNamespaceAndName(triple.predicate);
        var objectSplit = splitIntoNamespaceAndName(triple.object);

        dynamicNames[subjectSplit.namespace] = dynamicNames[subjectSplit.namespace] || {};
        dynamicNames[subjectSplit.namespace][subjectSplit.name] = true;

        dynamicNames[predicateSplit.namespace] = dynamicNames[predicateSplit.namespace] || {};
        dynamicNames[predicateSplit.namespace][predicateSplit.name] = true;

        dynamicNames[objectSplit.namespace] = dynamicNames[objectSplit.namespace] || {};
        dynamicNames[objectSplit.namespace][objectSplit.name] = true;
    }
    else if (!triple) {
        changeSyntaxCheckState("passed");
        editor.custom.dynamicNames = dynamicNames;

        if (prefixes) {
            editor.custom.prefixes = prefixes;
            allPrefixes = prefixes
            yasgui.selectTabId().yasr.config.prefixes = allPrefixes
        }
        updateGraphicalView();
    }
};

var shrinkPrefix = function (iri) {
    for (var ns in editor.custom.prefixes) {
        var prefix = editor.custom.prefixes[ns];
        if (iri.indexOf(prefix) === 0) {
            if (prefix !== '') {
                var suffix = iri.split(prefix)[1];
                return ns + ":" + suffix;
            }
        }
    }

    return iri;
}

var getPreparedNode = function (rdfTerm, type) {
    var node = {}
    var label = shrinkPrefix(rdfTerm.id);
    if (label.length > labelMaxLength) {
        var title = label;
        label = label.substr(0, labelMaxLength - 1) + "...";
        node = { id: rdfTerm.id, label: label, type: type, title: title };
    }
    else
        node = { id: rdfTerm.id, label: label, type: type };

    if (Util.isLiteral(rdfTerm)) {
        node.shape = 'box';
        node.shapeProperties = {};
        node.shapeProperties.borderDashes = [5, 5];
        node.color = { background: 'yellow', border: 'black', highlight: { background: '#F2F59D', border: 'red' } };
    }

    return node;
}

var idExists = function (arr, val) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i].id == val)
            return true;
    }

    return false;
}

var initializeGraphicalView = function (physicsEnabled) {
    var nodes = [];
    var edges = [];

    store.forEach(function (t) {
        // var subject = t.subject.id.toString();
        // var predicate = t.predicate.id.toString();
        // var object = t.object.id.toString();

        if (!idExists(nodes, t.subject.id)) {
            nodes.push(getPreparedNode(t.subject, "subject"));
        }
        if (!idExists(nodes, t.object.id)) {
            nodes.push(getPreparedNode(t.object, "object"));
        }

        edges.push({ from: t.subject.id, to: t.object.id, label: shrinkPrefix(t.predicate.id), type: "predicate", arrows: "to" });
    });

    var container = document.getElementById('divGraph');
    var data = {
        nodes: nodes,
        edges: edges
    };
    var options = {
        manipulation: {
            // addNode: function (data, callback) {
            //     // filling in the popup DOM elements
            //     document.getElementById('operation').innerHTML = "Add Node";
            //     $("#label").tooltip("enable");
            //     document.getElementById('label').value = data.label;
            //     document.getElementById('saveButton').onclick = saveNode.bind(this, data, callback);
            //     document.getElementById('cancelButton').onclick = clearPopUp.bind();
            //     document.getElementById('network-popUp').style.display = 'block';
            // },
            // editNode: function (data, callback) {
            //     // filling in the popup DOM elements
            //     document.getElementById('operation').innerHTML = "Edit Node";
            //     $("#label").tooltip("disable");
            //     document.getElementById('label').value = data.title != null ? data.title : data.label;
            //     document.getElementById('saveButton').onclick = saveNode.bind(this, data, callback);
            //     document.getElementById('cancelButton').onclick = cancelEdit.bind(this, callback);
            //     document.getElementById('network-popUp').style.display = 'block';
            // },
            // deleteNode: function (data, callback) {
            //     $("#dialog").dialog({
            //         dialogClass: "no-close",
            //         buttons: {
            //             YES: function () { $(this).dialog("close"); delNode(data, true, callback); },
            //             NO: function () { $(this).dialog("close"); delNode(data, false, callback); },
            //             cancel: function () { $(this).dialog("close"); callback(); }
            //         }
            //     }).css("display", "block");
            // },
            // addEdge: function (data, callback) {
            //     document.getElementById('operation').innerHTML = "Add Edge";
            //     $("#label").tooltip("disable");
            //     document.getElementById('label').value = "new";
            //     document.getElementById('saveButton').onclick = saveEdge.bind(this, data, callback);
            //     document.getElementById('cancelButton').onclick = clearEdge.bind(this, data);
            //     document.getElementById('network-popUp').style.display = 'block';

            //     if (data.from == data.to) {
            //         var r = confirm("Do you want to connect the node to itself?");
            //         if (r == true) {
            //             callback(data);
            //         }
            //         clearPopUp();
            //     }
            //     else {
            //         callback(data);
            //     }
            // },
            // editEdge: function (data, callback) {
            //     // filling in the popup DOM elements
            //     document.getElementById('operation').innerHTML = "Edit Edge";
            //     $("#label").tooltip("disable");
            //     document.getElementById('label').value = data.label;
            //     document.getElementById('saveButton').onclick = saveEdge.bind(this, data, callback);
            //     document.getElementById('cancelButton').onclick = cancelEdit.bind(this, callback);
            //     document.getElementById('network-popUp').style.display = 'block';
            // },
            // deleteEdge: function (data, callback) {
            //     $("#dialog").dialog({
            //         dialogClass: "no-close",
            //         buttons: {
            //             YES: function () { $(this).dialog("close"); delEdge(data, true, callback); },
            //             NO: function () { $(this).dialog("close"); delEdge(data, false, callback); },
            //             cancel: function () { $(this).dialog("close"); callback(); }
            //         }
            //     }).css("display", "block");
            // }
        },
        physics: {
            enabled: physicsEnabled,
            barnesHut: { gravitationalConstant: -2500, springConstant: 0.001, springLength: 50 }
        },
        edges: { smooth: { type: 'continuous' } }
    };

    network = new vis.Network(container, data, options);

    // network.on("click", function (params) {
    //     if (params.nodes.length == 1) {
    //         if (network.isCluster(params.nodes[0]) == true) { // if the node is a cluster, we open it up
    //             network.openCluster(params.nodes[0])

    //             for (var i = 0; i < clusters.length; i++)
    //                 if (clusters[i].id == params.nodes[0]) {
    //                     clusters.splice(i, 1);
    //                     break;
    //                 }
    //         }
    //         else { // if the node is not a cluster, we highlight its matches in the code view
    //             var nodeID = shrinkPrefix(params.nodes[0]);
    //             var query = new RegExp(nodeID + '(?![A-Za-z0-9_-])');
    //             var cursor = editor.getDoc().getSearchCursor(query);
    //             var res = cursor.findNext();

    //             var doc = editor.getDoc();
    //             if (res)
    //                 doc.setCursor(cursor.pos.from.line);

    //             clearMarks();
    //             scrollbarMarks = editor.showMatchesOnScrollbar(query, true, "highlight-scrollbar");
    //             while (res) {
    //                 textMarks.push(doc.markText(cursor.pos.from, cursor.pos.to, { className: "highlight" }));
    //                 res = cursor.findNext();
    //             }
    //         }
    //     }
    //     else
    //         clearMarks();
    // });
}

var updateGraphicalView = function () {
    // if (store.size == 0) {
    //     initializeGraphicalView(true);

    //     if (store.size > 500)
    //         makeClusters();
    //     if (stpre.size > 1000)
    //         makeClusters();

    //     hidden = true;
    //     //toggle_hide_defaults();
    //     //document.getElementById("hide-nodes").checked = true;
    // }
    // else {
    //     var a1 = N3.Store();
    //     a1.addTriples(oldTriples);
    //     var a2 = N3.Store();
    //     a2.addTriples(newTriples);
    //     var diffOld = triplesDiff(a1, a2);
    //     var diffNew = triplesDiff(a2, a1);

    //     // remove the old SPOs
    //     diffOld.forEach(function (e) {
    //         var s = network.body.data.nodes.get(e.subject);
    //         var o = network.body.data.nodes.get(e.object);

    //         if (s != null) {
    //             var edgesNo = network.getConnectedEdges(e.subject).length;
    //             if (edgesNo <= 1)
    //                 network.body.data.nodes.remove(s);
    //         }

    //         if (o != null) {
    //             var edgesNo = network.getConnectedEdges(e.object).length;
    //             if (edgesNo <= 1)
    //                 network.body.data.nodes.remove(o);
    //         }

    //         predicate_label = shrinkPrefix(e.predicate);
    //         var p = network.body.data.edges.get({
    //             filter: function (elem) {
    //                 return (elem.label == predicate_label && elem.from == e.subject && elem.to == e.object);
    //             }
    //         });

    //         if (p.length > 0)
    //             network.body.data.edges.remove(p[0]);
    //     });

    //     // add the new SPOs
    //     diffNew.forEach(function (e) {
    //         if (network.body.data.nodes.get(e.subject) == null)
    //             network.body.data.nodes.add(getPreparedNode(e.subject, "subject"));
    //         if (network.body.data.nodes.get(e.object) == null)
    //             network.body.data.nodes.add(getPreparedNode(e.object, "object"));

    //         var items = network.body.data.edges.get({
    //             filter: function (elem) {
    //                 return (elem.label == shrinkPrefix(e.predicate) && elem.from == e.subject && elem.to == e.object);
    //             }
    //         });
    //         if (items.length == 0)
    //             network.body.data.edges.add({ from: e.subject, to: e.object, label: shrinkPrefix(e.predicate), type: "predicate", arrows: "to" });
    //     });
    // }

    // oldTriples = newTriples.slice();
    // newTriples = [];
    initializeGraphicalView(true);
};

var checkSyntax = function () {
    /* remove all previous errors  */
    /* TODO: IMPROVE EFFICIENCY */
    editor.eachLine(function (line) {
        editor.getDoc().removeLineClass(line, "wrap");
        editor.clearGutter("breakpoints");
    });

    var parser, content;
    //if (state.fileIsLoaded) {
    content = editor.getValue();
    parser = new N3.Parser();
    store = new N3.Store();
    parser.parse(content, parserHandler);
    //}
};

var checkForUpdates = function () {
    if (state.syntaxCheck === "pending" && (state.fileIsLoaded || editor.getValue() != "")) {
        changeSyntaxCheckState("working");
        checkSyntax();
    }
};

window.setInterval(checkForUpdates, 1000);

//////////////////////////////////////////////////////////////////
/// SPARQL Editor Code

refreshYasguiControls()

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        refreshYasguiControls();
    })
})

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('mousedown', removeContextTabMenu)
})

function removeContextTabMenu(e) {
    e = e || window.event;

    if ("which" in e)  // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
        if (e.which === 3) {
            var interval = setInterval(() => {
                if (document.querySelectorAll('.yasgui .context-menu').length > 0) {
                    document.querySelectorAll('.yasgui .context-menu')[0].remove()
                    clearInterval(interval)
                }
            }, 10);

        }
        else if ("button" in e)  // IE, Opera 
            if (e.button === 2) {
                var interval = setInterval(() => {
                    if (document.querySelectorAll('.yasgui .context-menu').length > 0) {
                        document.querySelectorAll('.yasgui .context-menu')[0].remove()
                        clearInterval(interval)
                    }
                }, 10);
            }
}

document.getElementsByClassName('addTab')[0].addEventListener('click', (e) => {
    e.target.parentNode.previousElementSibling.addEventListener('click', (e) => {
        refreshYasguiControls();
    })

    e.target.parentNode.previousElementSibling.getElementsByClassName('closeTab')[0].addEventListener('click', (e) => {
        refreshYasguiControls();
    })

    e.target.parentNode.previousElementSibling.addEventListener('mousedown', removeContextTabMenu);

    refreshYasguiControls();
})

function refreshYasguiControls() {
    for (const autocompleter in yasgui.selectTabId().yasqe.autocompleters) {
        yasgui.selectTabId().yasqe.disableCompleter(autocompleter);
    }

    yasgui.selectTabId().yasqeWrapperEl.getElementsByClassName('yasqe_share')[0].setAttribute('style', 'display:none;');

    yasgui.selectTabId().yasqeWrapperEl.getElementsByClassName('yasqe_queryButton')[0].addEventListener('click', runQuery)

    for (let i = 0; i < createModalButtons().length; i++) {
        yasgui.selectTabId().yasqeWrapperEl.getElementsByClassName('yasqe_buttons')[0].appendChild(createModalButtons()[i])
    }

    //yasgui.selectTabId().yasqe.addPrefixes(allPrefixes);

    //Yasr Configuration
    let length = yasgui.selectTabId().yasr.headerEl.getElementsByClassName('yasr_btnGroup')[0].children.length;
    for (let i = length - 1; i >= 2; i--) {
        let children = yasgui.selectTabId().yasr.headerEl.getElementsByClassName('yasr_btnGroup')[0].children;
        children[i].parentNode.removeChild(children[i])
    }
    yasgui.selectTabId().yasr.config.prefixes = allPrefixes

    /////////////////////////////////////////////////
    /// Refresh Modal
    //DisplayPrefixes()
}

function createModalButtons() {
    document.getElementById('modalButton').innerHTML += `<div class="dropdown mt-2" id="btnModals">
                                    <i class="bi bi-plus-circle-fill dropdown-toggle fs-1" data-bs-toggle="dropdown" aria-expanded="false" title="More options..."></i>
                                  <div class="dropdown-menu" aria-labelledby="dropdownMenuButton1">
                                    <i class="bi bi-folder2-open dropdown-item fs-2" data-bs-toggle="modal" data-bs-target="#exampleModal" title="SPARQL Examples"></i>
                                    <i class="bi bi-link-45deg dropdown-item fs-2" data-bs-toggle="modal" data-bs-target="#modalPrefixes" title="Add Prefixes" onclick="DisplayPrefixes()"></i>
                                    <i class="bi bi-clock-history dropdown-item fs-2" data-bs-toggle="modal" data-bs-target="#modalHistory" title="Delete History"></i>
                                  </div>
                                </div>`

    return [document.getElementById('btnModals')]
}

function enableButton(btn) {
    btn.classList.remove('busy')
}

function disableButton(btn) {
    btn.classList.add('busy')
}

async function runQuery(e) {
    if (e.target.parentElement.parentElement.parentNode.className === 'yasqe_queryButton query_valid') {
        //alert('click')
        const start = Date.now();
        var button = e.target.parentElement.parentElement.parentNode
        disableButton(button)

        let myEngine = new Comunica.QueryEngine();

        myEngine.query(yasgui.selectTabId().yasqe.getValue(), {
            sources: [store],
        }).then((result) => {
            myEngine.resultToString(result, 'application/sparql-results+json', result.context)
                .then((d) => {
                    json = ''
                    d.data.on('data', (a) => {
                        json += a
                    })
                    d.data.on('end', () => {
                        const end = Date.now();
                        if (json !== '') {
                            yasgui.selectTabId().yasr.setResponse({
                                data: (json === '' ? null : json),
                                contentType: "application/sparql-results+json",
                                status: 200,
                                executionTime: 1000, // ms error to show
                            }, (end - start))
                        }
                        else {

                            resetResponse('No record found.')
                        }

                        enableButton(button);
                    })
                })
        }).catch(e => {
            //console.error(e)
            resetResponse(e)
            enableButton(button);
        });
    }
}

function resetResponse(msg) {
    //json = "\{\"head\": {\"vars\":[\"obj\",\"pred\",\"sub\"]}, \"results\":{ \"bindings\": [] }}"
    //yasgui.selectTabId().yasr.setResponse({
    //    data: json,
    //    contentType: "application/sparql-results+json",
    //    status: 200,
    //    executionTime: 1000, // ms error to show
    //}, 0)
    //yasgui.selectTabId().yasr
    yasgui.selectTabId().yasrWrapperEl.getElementsByClassName('yasr_results')[0].innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show mt-3" role="alert">
            <strong><i class="bi bi-info-circle-fill"></i></strong> ${msg}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`;
}

/////////////////////////////////////////
// Delete Yasgui history
function DeleteHistory() {
    localStorage.removeItem('yagui__config')
    localStorage.removeItem('prefixes')
    location.reload();
}

////////////////////////////////////////////////////////////////////////
function showQueryOnEditor(control) {
    let q = Yasqe.autoformatString(control.parentNode.nextElementSibling.innerText)
    yasgui.selectTabId().yasqe.setValue(q);
    yasgui.selectTabId().yasqe.autoformat()
    $("#exampleModal").modal('hide');
}
////////////////////////////////////////////////////////
/// Display Prefixes on Modal
function DisplayPrefixes() {
    let checkLists = '';
    for (const [key, value] of Object.entries(allPrefixes)) {
        //console.log(`${key}: ${value}`);
        if (yasgui.selectTabId().yasqe.getPrefixesFromQuery()[key] !== undefined) {
            checkLists += `<label class="list-group-item active">
                            <input class="form-check-input me-1" type="checkbox" onclick="AddPrefixesOnEditor(this)" checked key="${key}" val="${value}">
                            ${key}: ${value}
                        </label>`;
        }
        else {
            checkLists += `<label class="list-group-item">
                            <input class="form-check-input me-1" type="checkbox" onclick="AddPrefixesOnEditor(this)" key="${key}" val="${value}">
                            ${key}: ${value}
                        </label>`;
        }
    }

    document.getElementById('divPrefixes').innerHTML = checkLists;
}

function AddPrefixesOnEditor(control) {
    let p = {}
    p[control.getAttribute('key')] = control.getAttribute('val')
    if (control.checked) {
        yasgui.selectTabId().yasqe.addPrefixes(p)
        control.parentNode.classList.add('active')
    }
    else {
        yasgui.selectTabId().yasqe.removePrefixes(p)
        control.parentNode.classList.remove('active')
    }
}
////////////////////////////////////////////////////////
/// Action Buttons
function new_clear_content() {
    //console.log(editor.getValue());
    editor.setValue('');
    store = new N3.Store();
    allPrefixes = [];
    yasgui.selectTabId().yasr.config.prefixes = allPrefixes
}

function openFile() {
    document.getElementById("ttlFile").click();
}

function selectFile() {
    const ttlFile = document.getElementById("ttlFile");
    try {
        if (ttlFile.files.length > 0) {
            const input = ttlFile.files[0];
            const reader = new FileReader();

            reader.onload = function (event) {
                const text = event.target.result;
                store = new N3.Store();
                editor.setValue(text);
                ttlFile.value = '';
            };

            reader.readAsText(input);
        }
        else {

        }
    } catch (e) {
        console.log(e)
        ttlFile.value = '';
    }

}

async function saveFile() {
    let filename = prompt("Please enter filename", "sample");
    if (filename !== null) {
        if (filename === "") filename = 'sample';
        const contentType = 'text/plain';
        const a = document.createElement('a');
        const file = new Blob([editor.getValue()], { type: contentType });
        filename = `${filename}.ttl`;

        a.href = URL.createObjectURL(file);
        a.download = filename;
        a.click();

        URL.revokeObjectURL(a.href);
    }
}

function reload() {
    location.reload()
}

function loadRDFExamples(title) {
    if (title.includes('RDF')) {
        $('#modal_title').html(title);
        let html = `
                    <ul class="list-group list-group-flush">
                        <li class="list-group-item list-group-item-action">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" value="simple" name="rdoRDFExample" id="rdoRDFSimpleExample" checked>
                                <label class="form-check-label" for="rdoRDFSimpleExample">
                                    Simple RDF Example (Single I.Sicily RDF Data)
                                </label>
                            </div
                        </li>
                        <li class="list-group-item list-group-item-action">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" value="multiple isicily" name="rdoRDFExample" id="rdoRDFMultipleExample">
                                <label class="form-check-label" for="rdoRDFMultipleExample">
                                    Complex RDF Example (Multiple I.Sicily RDF Data)
                                </label>
                            </div>
                        </li>
                        <li class="list-group-item list-group-item-action">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" value="multi_hetero" name="rdoRDFExample" id="rdoRDFMultiHeteroExample">
                                <label class="form-check-label" for="rdoRDFMultiHeteroExample">
                                    Multiple and Heterogeneous RDF Example (I.Sicily, EDH)
                                </label>
                            </div>
                        </li>
                    </ul>
                    <div class="row">
                        <div class="col-md-12">
                            <button type="button" class="btn btn-primary float-end" onclick="loadRDFData()">Load Example</button>
                        </div>
                    </div>
                    `;
        $('#divGenericModal').html(html);
    }
    else {
        alert('other')
    }
}

function loadRDFData() {
    var checkedValue = $("input[name='rdoRDFExample']:checked").val();
    let quereis = '';
    if (checkedValue === 'simple') {
        loadFile('examples_data/simple.ttl');
        $('#btnShowQueries').removeClass('d-none');
        quereis = `<li>Retrieve the label of the object with the ID <b>isicily:ISic000002</b>.</li>`;
        quereis += `<li>Find the material of the object with the ID <b>isicily:ISic000002</b>.</li>`;
        quereis += `<li>Retrieve the type of monument represented by the object with the ID <b>isicily:ISic000002</b>.</li>`;
        quereis += `<li>Find the latitude and longitude of the spatial location of the object with the ID <b>isicily:ISic000002</b>. (Hint: Use BIND, SPLIT and STR)</li>`;
        quereis += `<li>Retrieve various details related to the object with the ID <b>isicily:ISic000002</b>, including its label, material, current location, found location, author, and license.</li>`;
    }
    else if(checkedValue === 'multiple isicily'){
        $('#btnShowQueries').removeClass('d-none');
        loadFile('examples_data/multiple_isicily.ttl');
        quereis = `<li>Retrive the common pleiades (foundAt) from two IDs <b>isicily:ISic000014</b>, <b>isicily:ISic000024</b></li>`;
        quereis += `<li>Retrive unique properties from the given data.</li>`;
        quereis += `<li>Retrive all Diplomatic Text from the data with their IDs.</li>`;
        quereis += `<li>Retrieve the writing language of the inscription.</li>`;
        quereis += `<li>Retrieve the inscription ID, label, and material. The material should begin with 'li'. Order the results by label in ascending order. </li>`;
    } 
    else if(checkedValue === 'multi_hetero'){
        loadFile('examples_data/multi_hetero.ttl');
        $('#btnShowQueries').removeClass('d-none');
        quereis = `<li>Find total number of inscriptions</li>`;
        quereis += `<li>Find total number of triples.</li>`;
        quereis += `<li>Find common/close match inscriptions based on Trismegistos.</li>`;
        quereis += `<li>Retrieve all the labels of the human-made objects along with their current locations</li>`;
        quereis += `<li>Find the human-made objects made of limestone</li>`;
        quereis += `<li>Show all the <a href="https://www.eagle-network.eu/voc/typeins/lod/88.html" target="_blank">TIT. DEDICATORIUS</a></li>`;
    } 
    else {
        alert("No option selected");
    }

    $('#listQueries').html(quereis);
}

function full_screen(ele){
    //$('#turtle-editor').removeClass('col-md-5').addClass('col-md-12');
    $('#turtle-editor').toggleClass("col-md-12 col-md-5");
    $(ele).toggleClass("bi-fullscreen-exit bi-arrows-fullscreen");
}

// $('#btn-close-example').click((e)=>{
//     $('#modal-dialog-generic').removeClass('modal-fullscreen');
//     $('#modal-dialog-generic').addClass('modal-lg');
// })

function loadFile(fileName) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', fileName, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                const content = xhr.responseText;
                //console.log(content);
                store = new N3.Store();
                editor.setValue(content);
                ttlFile.value = '';
                $('#btn-close-example').click();
            } else {
                console.error('Failed to load file: ' + xhr.status);
            }
        }
    };
    xhr.send();
}

async function copyContent() {
    let text = editor.getValue();
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            alert('File content has been copied to clipboard.')
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    }
    await copy();
}