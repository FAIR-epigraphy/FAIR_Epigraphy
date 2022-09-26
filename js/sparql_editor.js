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
//////////////////////////////////////////////////////////////////
/// Load data
const { DataFactory } = N3;
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
    document.getElementById('modalButton').innerHTML =
        `<button id="btnModal" type="button" class="btn btn-outline-secondary fs-6 float-start" data-bs-toggle="modal" data-bs-target="#exampleModal" title="SPARQL Examples">
                <i class="bi bi-folder2-open"></i>
            </button>`

    document.getElementById('modalButton').innerHTML +=
        `<button id="btnModalPrefix" type="button" class="btn btn-outline-secondary fs-6 float-start" data-bs-toggle="modal" data-bs-target="#modalPrefixes" title="Add Prefixes" onclick="DisplayPrefixes()">
                <i class="bi bi-link-45deg"></i>
            </button>`

    document.getElementById('modalButton').innerHTML +=
        `<button id="btnResetHistory" type="button" class="btn btn-outline-danger fs-6 float-start" data-bs-toggle="modal" data-bs-target="#modalHistory" title="Delete History">
                <i class="bi bi-clock-history"></i>
        </button>`;

    return [document.getElementById('btnModal'), document.getElementById('btnModalPrefix'), document.getElementById('btnResetHistory')]
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

///////////////////////////////////////////////////////////////////////////
//// Fetch RDF data
fetch("data/data.txt").then(function (response) {
    return response
}).then(function (data) {
    return data.text()
}).then(function (dataset) {
    const parser = new N3.Parser();
    parser.parse(dataset,
        (error, quaad, prefixes) => {
            if (quaad) {
                store.addQuad(
                    quaad.subject,
                    quaad.predicate,
                    quaad.object,
                )
            }
            else {
                /////////////////////////////////////////////////
                allPrefixes = prefixes;
                DisplaySPARQL()

                yasgui.selectTabId().yasr.config.prefixes = allPrefixes
                //yasgui.selectTabId().yasqe.addPrefixes(allPrefixes);
                //console.log(prefixes)
            }

        });
}).catch(function (err) {
    console.log('Fetch problem show: ' + err.message);
});
////////////////////////////////////////////////////////////////////////
//////////
function DisplaySPARQL() {
    let table = ``;
    for (let q of SAPRQL_Queries) {
        table += `<tr class="table-light">
                                <td colspan="4">${q.Query}</td>
                            </tr>`
        let row = ``;
        for (let d of q.Queries) {
            row += `<tr>
                         <td><span class="text-primary" style="cursor:pointer;" title="Select" onclick='showQueryOnEditor(this)'><u>${d.query}</u></span> </td>
                                <td style="display:none;"><pre>${d.Full_Query.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;")}</pre></td>
                                <td colspan="3"><i class="bi bi-eye float-end" onmouseover="changeContent(this)"></i></td>
                                <td style="display: none;">
                                    ${d.Preview_Query}
                                </td>
                            </tr>`
        }
        table += row;
    }

    document.getElementById('divQueries').innerHTML = table;
}

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