
function buildQueryString(params) {
    var data = [];
    for (var i in params) {
        data.push(encodeURIComponent(i) + "=" + encodeURIComponent(params[i]));
    }
    return data.join("&");
}

function ajax(method, url, headers, body, callback) {
    var req = new XMLHttpRequest;
    req.open(method, url, false);
    for (var i in headers) {
        req.setRequestHeader(i, headers[i]);
    }
    req.onload = callback;
    req.send(body);
}

function ajaxGet(url, callback) {
    ajax("GET", url, null, null, callback);
}

function ajaxPost(url, params, callback) {
    var headers = { "Content-type": "application/x-www-form-urlencoded" };
    ajax("POST", url, headers, buildQueryString(params), callback);
}


var userdata = {
    baseUrl: "https://cryptic-shelf-2538.herokuapp.com",
    csrfToken: null,
    valid: function() { return !!this.csrfToken },
    fetch: function() {
        var self = this;
        ajaxGet(this.baseUrl+"/api/v1/auth_token", function(e) {
            var data = JSON.parse(e.target.responseText);
            if (data.status === "ok") {
                self.csrfToken = data.data;
            } else {
                self.csrfToken = null;
                if (data.error === "Not allowed") {
                    alert("You need to sign in first.");
                } else {
                    alert("Could not fetch auth token. Status: " + data.status);
                }
            }
        });
    }
};

function onClickCallback(info, tab) {

    if (!userdata.valid())
        userdata.fetch();
    if (!userdata.valid())
        return;

    var url = "", title = "", comment = "";

    switch (info.menuItemId) {
        case "ctx-page":
            url = info.pageUrl;
            title = tab.title;
            break;
        case "ctx-link":
            url = info.linkUrl;
            title = url;
            break;
        case "ctx-image":
        case "ctx-video":
        case "ctx-audio":
            url = info.srcUrl;
            title = tab.title;
            break;
        case "ctx-frame":
            url = info.frameUrl;
            title = tab.title;
            break;
        case "ctx-selection":
            url = info.pageUrl;
            title = info.selectionText;
            break;
    }
    
    title = prompt("Title", title) || title;
    comment = prompt("Comment (optional)", comment) || comment;
    
    var apiUrl = userdata.baseUrl+"/api/v1/list/default/item/create";
    var params = {
        "authenticity_token": userdata.csrfToken,
        "item[title]": title,
        "item[url]": url,
        "item[comment]": comment
    };
    
    ajaxPost(apiUrl, params, function(e) {
        var data = JSON.parse(e.target.responseText);
        if (data.status === "ok") {
        } else {
            alert(e.target.responseText);
            if (data.error === "Invalid token") {
                userdata.fetch();
                if (userdata.valid()) {
                    params["authenticity_token"] = userdata.csrfToken;
                    ajaxPost(apiUrl, params, null);
                }
            } else {
                alert("There was an error:\n\n" + e.target.responseText);
            }
        }
    });
}

chrome.contextMenus.onClicked.addListener(onClickCallback);

chrome.runtime.onInstalled.addListener(function() {

    ["page","selection","link","frame","image","video","audio"
    ].forEach(function(context) {
        var thingName = context !== "video" && context !== "audio" ?
            context : "media";
        var title = "Add " + thingName + " to list";
        
        chrome.contextMenus.create({
            "title": title,
            "contexts": [context],
            "id": "ctx-" + context
        });
    });
});
