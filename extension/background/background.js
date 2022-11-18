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
        } else {
            // TODO: Add code for Chrome
            chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((rule) => {
                // console.log('Rule matched:', rule);
            });
        }
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

    const timeComments = []
    // let timeComment = null;    
    
    // Let's take only the furst minimally suitable comment.
    // Later on, maybe implement more sophisticated comment filtering.
    for (let i = 0; i < comments.length; i++) {
        const tsContexts = getTimestampContexts(comments[i].text)
        console.log('i, tsContexts =', i, tsContexts);

        if (tsContexts.length) {
            return tsContexts
        }

        // if (!isChaptersComment(tsContexts)) {
        //     continue
        // }

        // for (const tsContext of tsContexts) {
        //     console.log('tsContext =', tsContext);
        //     const timeComment = newTimeComment(tsContext)
        //     console.log('timeComment =', timeComment);
        //     timeComments.push(timeComment)
        // }

        // console.log('timeComments =', timeComments)
        // return timeComments
    }    
    
    // const timeComments = []
    // for (const comment of comments) {
    //     const tsContexts = getTimestampContexts(comment.text)
    //     console.log('tsContexts =', tsContexts);

    //     if (isChaptersComment(tsContexts)) {
    //         continue
    //     }
    //     for (const tsContext of tsContexts) {
    //         timeComments.push(newTimeComment(comment.authorAvatar, comment.authorName, tsContext))
    //     }
    // }
    // console.log('timeComments =', timeComments);
    // return timeComments
}

function isChaptersComment(tsContexts) {
    console.log('function isChaptersComment :: tsContexts =', tsContexts)
    if (tsContexts.length < 3) {
        return false
    }
    // if (tsContexts[0].time !== 0) { // In some comments, the first timestamp is not zero!
    //     return false
    // }
    return true
}

async function fetchComments(videoId) {
    return await youtubei.fetchComments(videoId)
}

// function newTimeComment(authorAvatar, authorName, tsContext) {
//     return {
//         authorAvatar,
//         authorName,
//         timestamp: tsContext.timestamp,
//         time: tsContext.time,
//         text: tsContext.text
//     }
// }

function newTimeComment({ timestamp, time, text }) {
    return {
        timestamp,
        time,
        text,
    }
}

// function getTimestampContexts(text) {
//     const result = []
//     const positions = findTimestamps(text)
//     for (const position of positions) {
//         const timestamp = text.substring(position.from, position.to)
//         const time = youtubei.parseTimestamp(timestamp)
//         if (time === null) {
//             continue
//         }
//         result.push({
//             text,
//             time,
//             timestamp
//         })
//     }
//     return result
// }

// const TIMESTAMP_PATTERN = /^(?:(\d?\d):)?(\d?\d):(\d\d)\s(.+)$/
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

    // const result = []
    // const positions = findTimestamps(text)
    // for (const position of positions) {
    //     const timestamp = text.substring(position.from, position.to)
    //     const time = youtubei.parseTimestamp(timestamp)
    //     if (time === null) {
    //         continue
    //     }
    //     result.push({
    //         text,
    //         time,
    //         timestamp
    //     })
    // }
    // return result
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

