
NodeList.prototype.forEach = Array.prototype.forEach;

var app = {
    baseUrl: "https://cryptic-shelf-2538.herokuapp.com",
    scripts: {},
    stylesheets: {},
    _a: document.createElement("a"),
    headTags: {}
};

function normalizeElementUrl(tag, attr) {
    app._a.href = tag.attributes[attr].value;
    tag.setAttribute(attr, app._a.href);
    return app._a.href;
}

function pathUrl(path) {
    return app.baseUrl + path;
}

function buildQueryString(params) {
    var data = [];
    for (var i in params) {
        data.push(encodeURIComponent(i) + "=" + encodeURIComponent(params[i]));
    }
    return data.join("&");
}

function ajax(method, url, headers, body, callback) {
    var req = new XMLHttpRequest;
    req.open(method, url, true);
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

function loadHeadTags(doc) {
    var oldTags = app.headTags, newTags = {};

    // Get new tags
    var newTagCollection = doc.head.children;
    for (var i = 0; i < newTagCollection.length; i++) {
        var tag = newTagCollection[i], id = null;
        switch (tag.nodeName) {
            case "SCRIPT":
                if (!tag.hasAttribute("src")) break;
                normalizeElementUrl(tag, "src");
                id = tag.nodeName + "~" + tag.src;
                break;

            case "LINK":
                if (!tag.hasAttribute("href")) break;
                normalizeElementUrl(tag, "href");
                id = tag.nodeName + "~" + tag.href;
                break;
            
            case "META":
                if (tag.hasAttribute("name") && tag.hasAttribute("content")) {
                    id = tag.nodeName + "~" + tag.name + "~" + tag.content;
                }
                break;
        }
        if (id) newTags[id] = tag;
    }

    // remove oldTags not in newTags (unless it's a script)
    for (var id in oldTags) {
        var oldTag = oldTags[id];
        if (!newTags.hasOwnProperty(id) && oldTag.nodeName !== "SCRIPT") {
            document.head.removeChild(oldTag);
            delete oldTags[id];
        }
    }

    // add new tags
    for (var id in newTags) {
        if (!oldTags.hasOwnProperty(id)) {
            var tag = document.createElement(newTags[id].nodeName);
            var attrs = newTags[id].attributes;
            for (var i = 0; i < attrs.length; i++) {
                tag.setAttribute(attrs[i].name, attrs[i].value);
            }
            document.head.appendChild(tag);
            oldTags[id] = tag;
        }
    }
}

function loadHTML(html) {
    var doc = (new DOMParser).parseFromString(html, "text/html");
    
    loadHeadTags(doc);
    document.title = doc.title;
    document.documentElement.replaceChild(doc.body, document.body);
    document.dispatchEvent(new Event('page:change'));
    attachHandlers();
}

function loadHTMLe(e) {
    loadHTML(e.target.responseText);
}

function loadUrl(url) {
    history.pushState({url: url}, "", url);
    ajaxGet(url, loadHTMLe);
}

function loadPath(path) {
    loadUrl(pathUrl(path));
}

function clickHandler(e) {
    e.preventDefault();
    loadPath(this.pathname);
    return false;
}

function attachLinkHandlers() {
    document.querySelectorAll(
        'a[href]:not([data-no-turbolink]):not([href^="#"]):not([target="_blank"])'
    ).forEach(function(a) {
        a.removeEventListener("click", clickHandler, false);
        a.addEventListener("click", clickHandler, false);
    });
}

function formSubmitHandler(e) {
    e.preventDefault();
    
    var a = document.createElement("a"), params = {};

    a.href = this.action;
    this.querySelectorAll('input[name]').forEach(function(inp) {
        if (inp.type === "radio") {
            if (inp.checked) params[inp.name] = inp.value;
        } else {
            params[inp.name] = inp.value;
        }
    });
    
    var url = pathUrl(a.pathname);
    var headers = null;
    var qstr = buildQueryString(params);
    var body = null;
    if (this.method.toUpperCase() === "GET") {
        url = url + "?" + qstr;
    } else {
        headers = { "Content-type": "application/x-www-form-urlencoded" };
        body = qstr;
    }
    ajax(this.method, url, headers, body, loadHTMLe);
    // TODO: pushState with "TM-finalURL" header
    
    return false;
}

function attachFormHandlers() {
    document.querySelectorAll("form").forEach(function(form) {
        form.removeEventListener("submit", formSubmitHandler, false);
        form.addEventListener("submit", formSubmitHandler, false);
    });
}

function attachHandlers() {
    attachLinkHandlers();
    attachFormHandlers();
}


document.addEventListener("DOMContentLoaded", function () {
    attachHandlers();
    loadPath("/");
});

document.addEventListener('linkcreated', function(e) {
    var a = e.detail.target;
    a.removeEventListener("click", clickHandler, false);
    a.addEventListener("click", clickHandler, false);
});
