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
    // if (request.type == 'fetchTimeComments') {
    //     fetchTimeComments(request.videoId)
    //         .then(sendResponse)
    //         .catch(e => {
    //             console.error(e)
    //         })
    //     return true
    // }
})

function setUpWebRequestOriginRemoval() {
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
        } // Otherwise Origin is removed via declarative net request
    })    
}

async function fetchChapters(videoId) {
    return await youtubei.fetchChapters(videoId)
}
