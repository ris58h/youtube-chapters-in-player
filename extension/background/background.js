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
})

function setUpWebRequestOriginRemoval() {
    chrome.permissions.contains({ 
        permissions: ['webRequestBlocking'],
        origins: ['https://www.youtube.com/']
    }, (permissionExists) => {
        if (permissionExists) { // In Firefox (Manifest V2)
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
        } // In Chrome/Chromium (Manifest V3), Origin is removed via declarative net request
    })    
}

async function fetchChapters(videoId) {
    return await youtubei.fetchChapters(videoId)
}

// time-comments related code below

export async function fetchChaptersFromComments(videoResponse) {
    const comments = await youtubei.fetchComments(videoResponse)

    // Currently using only the first minimally suitable comment.
    // Maybe later implement more sophisticated comment selection.
    for (let i = 0; i < comments.length; i++) {
        const tsContexts = getTimestampContexts(comments[i].text)
        if (tsContexts.length) {
            return tsContexts
        }
    }    

    return []
}

function getTimestampContexts(text) {
    const TIMESTAMP_PATTERN = /^((?:\d?\d:)?(?:\d?\d:)\d\d)\s(.+)$/
    const chapters = []
    const lines = text.split("\r\n")

    for (let i = 0; i < lines.length; i++) {
        const tsMatch = lines[i].match(TIMESTAMP_PATTERN)
        if (!tsMatch) {
            return []
        }

        const timestamp = tsMatch[1]
        const title = tsMatch[2]
        const time = youtubei.parseTimestamp(timestamp)

        chapters.push({
            title,
            timestamp,
            time,
        })
    }

    return chapters
}
