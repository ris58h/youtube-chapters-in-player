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
    const videoResponse = await youtubei.fetchVideo(videoId)
    let chapters = youtubei.chaptersFromVideoResponse(videoResponse)
    if (chapters.length) {
        return chapters
    }

    chapters = await fetchChaptersFromComments(videoResponse)
    return chapters    
}

async function fetchChaptersFromComments(videoResponse) {
    const comments = await youtubei.fetchComments(videoResponse)

    const minNumChapters = 2

    for (let i = 0; i < comments.length; i++) {
        if (!comments[i].isPinned) {
            continue
        }
        const tsContexts = getTimestampContexts(comments[i].text)
        if (tsContexts.length >= minNumChapters) {
            return tsContexts
        }
    }    

    return []
}

function getTimestampContexts(text) {
    // const TIMESTAMP_PATTERN = /^((?:\d?\d:)?(?:\d?\d:)\d\d)\s(.+)$/
    const timestampSplitPattern = /((?:\d?\d:)?(?:\d?\d:)\d\d)\s/

    const chapters = []
    const lines = text.split(/\r?\n/)
    console.log('lines =', lines)

    for (let i = 0; i < lines.length; i++) {
        console.log('i =', i)
        console.log('lines[i] =', lines[i])
        const parts = lines[i]
            .trim()
            .split(timestampSplitPattern) 

        console.log('parts =', parts)

        // Normally:
        //   parts.length is always an odd number
        //   parts[0] contains an empty string (and is not used);
        //   parts[1], parts[3], etc. contain a chapter timestamp;
        //   parts[2], parts[4], etc. contain a chapter title.   

        // Example 1:
        // '0:09:27 стек вызовов / Call Stack'
        // =>
        // ['', '0:09:27', 'стек вызовов / Call Stack']

        // Example 2:
        // ' 0:09:27 стек вызовов / Call Stack 0:18:26 Mixed Solution 0:21:42 принцип LIFO'
        // =>
        // ['', '0:09:27', 'стек вызовов / Call Stack ', '0:18:26', 'Mixed Solution ', '0:21:42', 'принцип LIFO']

        if (parts.length < 3) {
            continue
        }

        const lastTimestampPos = parts.length - 2

        for (let p = 1; p <= lastTimestampPos; p += 2) {
            console.log('p =', p)
            console.log(parts[p])
            console.log(parts[p + 1])
            const title = parts[p + 1].trim()
            if (!title.length) {
                continue
            }
            
            const timestamp = parts[p]
            const time = youtubei.parseTimestamp(timestamp)

            chapters.push({
                title,
                timestamp,
                time,
            })         
        }
    }

    // for (let i = 0; i < lines.length; i++) {
    //     const tsMatch = lines[i].match(TIMESTAMP_PATTERN)
    //     if (!tsMatch) {
    //         return []
    //     }

    //     const timestamp = tsMatch[1]
    //     const title = tsMatch[2]
    //     const time = youtubei.parseTimestamp(timestamp)

    //     chapters.push({
    //         title,
    //         timestamp,
    //         time,
    //     })
    // }

    return chapters
}
