loadData("data/data_5.txt");

function loadData(file) {
    $("#data").load(file, function (responseTxt, statusTxt, xhr) {
        if (statusTxt == "success") {
            const parser = new N3.Parser();
            var obj = { inscriptionId: '', inscriptionURI: '', material: '', tmId: '', foundAt: '', geo: '' }
            var arrayList = [];
            parser.parse(responseTxt,
                (error, quad, prefixes) => {
                    if (quad) {
                        obj = {};
                        if (quad.predicate.toLowerCase().indexOf('type') !== -1 && quad.object.split('/').pop().indexOf('E22_Human-Made_Object') !== -1) {
                            obj.inscriptionId = quad.subject;
                            arrayList.push(obj);
                        }
                        if (quad.predicate.indexOf('page') !== -1) {
                            let index = arrayList.findIndex(x => x.inscriptionId +'/WrittenText' == quad.subject);
                            if (index !== -1) {
                                arrayList[index].inscriptionURI = quad.object;
                            }
                        }
                        if (quad.predicate.split('/').pop().indexOf('hasMaterial') !== -1) {
                            let index = arrayList.findIndex(x => x.inscriptionId == quad.subject);
                            if (index !== -1) {
                                arrayList[index].material = quad.object;
                            }
                        }
                        if (quad.predicate.split('/').pop().indexOf('P48_has_preferred_identifier') !== -1) {
                            let index = arrayList.findIndex(x => x.inscriptionId +'/Transcription' == quad.subject);
                            if (index !== -1) {
                                arrayList[index].tmId = quad.object;
                            }
                        }
                        if (quad.predicate.split('/').pop().indexOf('foundAt') !== -1) {
                            let index = arrayList.findIndex(x => x.inscriptionId == quad.subject);
                            if (index !== -1) {
                                arrayList[index].foundAt = quad.object;
                            }
                        }
                        if (quad.predicate.split('/').pop().indexOf('lat_long') !== -1) {
                            let index = arrayList.findIndex(x => x.inscriptionId+'#this' == quad.subject);
                            if (index !== -1) {
                                arrayList[index].geo = quad.object;
                            }
                        }
                    }
                    //    console.log(quad);
                    else {
                        //console.log("# That's all, folks!", prefixes);
                        dispalyHTMLContent(arrayList);

                    }
                });
        }
        if (statusTxt == "error")
            console.log("Error: " + xhr.status + ": " + xhr.statusText + ": <br />" + responseTxt);
    });
}

function dispalyHTMLContent(array) {
    let content = '';
    for (let ins of array) {
        content += `<div class="col-md-12">
                <h4>
                    <a href="javascript:void(0)" onclick="loadDetail('${encodeURIComponent(JSON.stringify(ins))
            }')" title="${ins.inscriptionId}" data-bs-toggle="modal" data-bs-target="#myModal">${getInscriptionId(ins.inscriptionId)}</a>
                </h4>
                <dl class="row">
                            <dt class="col-sm-1 ms-5">TM ID</dt>
                            <dd class="col-sm-10">${getTrismegistosID(ins.tmId)}</dd>
                            <dt class="col-sm-1 ms-5">Material</dt>
                            <dd class="col-sm-10">
                                ${getMaterial(ins.material)}
                            </dd>
                        </dl>
                    </div> <hr />`;
    }

   

    $('#content').html(content);
}

function loadDetail(obj) {
    obj = JSON.parse(decodeURIComponent(obj))
    localStorage.setItem('jsonObj', JSON.stringify(obj));
    $('#page').load('detail.html')
}