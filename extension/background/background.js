import * as youtubei from './youtubei.js'

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
        setUpWebRequestOriginRemoval()

        setTimeout(() => {
            fetchTimeComments(request.videoId)
            .then(sendResponse)
            .catch(e => {
                console.error(e)
            })
        }, 200)

        return true
    }
})

function setUpWebRequestOriginRemoval() {
    console.log('FUNCTION setUpWebRequestOriginRemoval')

    chrome.permissions.contains({ 
        permissions: ['webRequestBlocking'],
        origins: ['https://www.youtube.com/']
    }, (permissionExists) => {
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
        } else {
            // TODO: Add code for Chrome
            chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((rule) => {
                console.log('Rule matched:', rule);
            });
        }
    });    
}

async function fetchChapters(videoId) {
    return await youtubei.fetchChapters(videoId)
}

// time-comments related code below

async function fetchTimeComments(videoId) {
    const comments = await fetchComments(videoId)
    const timeComments = []
    for (const comment of comments) {
        const tsContexts = getTimestampContexts(comment.text)
        if (isChaptersComment(tsContexts)) {
            continue
        }
        for (const tsContext of tsContexts) {
            timeComments.push(newTimeComment(comment.authorAvatar, comment.authorName, tsContext))
        }
    }
    return timeComments
}

function isChaptersComment(tsContexts) {
    if (tsContexts.length < 3) {
        return false
    }
    if (tsContexts[0].time !== 0) {
        return false
    }
    return true
}

async function fetchComments(videoId) {
    return await youtubei.fetchComments(videoId)
}

function newTimeComment(authorAvatar, authorName, tsContext) {
    return {
        authorAvatar,
        authorName,
        timestamp: tsContext.timestamp,
        time: tsContext.time,
        text: tsContext.text
    }
}

function getTimestampContexts(text) {
    const result = []
    const positions = findTimestamps(text)
    for (const position of positions) {
        const timestamp = text.substring(position.from, position.to)
        const time = youtubei.parseTimestamp(timestamp)
        if (time === null) {
            continue
        }
        result.push({
            text,
            time,
            timestamp
        })
    }
    return result
}

function findTimestamps(text) {
    const result = []
    const timestampPattern = /(\d?\d:)?(\d?\d:)\d\d/g
    let match
    while ((match = timestampPattern.exec(text))) {
        result.push({
            from: match.index,
            to: timestampPattern.lastIndex
        })
    }
    return result
}

