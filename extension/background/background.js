import * as youtubei from './youtubei.js'

setUpWebRequestOriginRemoval()

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type == 'fetchChapters') {
        fetchChapters(request.videoId)
            .then(sendResponse)
            .catch(e => {
                console.error(e)
            })
        return true
    }
    if (request.type == 'fetchTimeComments') {
        fetchTimeComments(request.videoId)
            .then(sendResponse)
            .catch(e => {
                console.error(e)
            })
        return true
    }
})

function setUpWebRequestOriginRemoval() {
    console.log('FUNCTION setUpWebRequestOriginRemoval')

    chrome.permissions.contains({ 
        permissions: ['webRequestBlocking'],
        origins: ['https://www.youtube.com/']
    }, (permissionExists) => {
        console.log('permissionExists =', permissionExists);
        if (permissionExists) {
            // YouTube declines requests with wrong Origin.
            // We have to remove the Origin header which is added automatically by the browser.
            chrome.webRequest.onBeforeSendHeaders.addListener(
                details => {
                    const newRequestHeaders = details.requestHeaders.filter(header => {
                        return header.name.toLowerCase() !== "origin"
                    })
                    return {requestHeaders: newRequestHeaders}
                },
                {urls: ["https://www.youtube.com/*"]},
                ["blocking", "requestHeaders", chrome.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS].filter(Boolean)
            )
        } /* else {
            chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((rule) => {
                // console.log('Rule matched:', rule);
            });
        } */
    });    
}

async function fetchChapters(videoId) {
    return await youtubei.fetchChapters(videoId)
}

// time-comments related code below

async function fetchTimeComments(videoId) {
    console.log('FUNCTION fetchTimeComments')
    const comments = await fetchComments(videoId)
    console.log('comments =', comments);

    // Let's take only the furst minimally suitable comment.
    // Later on, maybe implement more sophisticated comment filtering.
    for (let i = 0; i < comments.length; i++) {
        const tsContexts = getTimestampContexts(comments[i].text)
        console.log('i, tsContexts =', i, tsContexts);

        if (tsContexts.length) {
            return tsContexts
        }
    }    

    return []
}

async function fetchComments(videoId) {
    return await youtubei.fetchComments(videoId)
}

const TIMESTAMP_PATTERN = /^((?:\d?\d:)?(?:\d?\d:)\d\d)\s(.+)$/

function getTimestampContexts(text) {
    console.log('function getTimestampContexts')
    const lines = text.split("\r\n")
    console.log('lines =', lines)

    const chapters = []

    for (let i = 0; i < lines.length; i++) {
        const tsMatch = lines[i].match(TIMESTAMP_PATTERN)
        console.log('i, lines[i], tsMatch =', i, lines[i], tsMatch)
        if (!tsMatch) {
            return []
        }

        const timestamp = tsMatch[1];
        const title = tsMatch[2];

        const time = youtubei.parseTimestamp(timestamp)

        chapters.push({
            title,
            timestamp,
            time,
        })
    }

    return chapters
}
