import * as youtubei from './youtubei.js'

const MIN_NUM_CHAPTERS = 2

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'fetchChapters') {
        fetchChapters(request.videoId)
            .then(sendResponse)
            .catch(e => {
                console.error(e)
            })
        return true
    }
})

async function fetchChapters(videoId) {
    const videoResponse = await youtubei.fetchVideo(videoId)
    let chapters = youtubei.chaptersFromVideoResponse(videoResponse)
    if (chapters.length) {
        return chapters
    }

    chapters = fetchChaptersFromDescription(videoResponse)
    if (chapters.length) {
        return chapters
    }

    chapters = await fetchChaptersFromComments(videoResponse)
    return chapters
}

function fetchChaptersFromDescription(videoResponse) {
    const description = youtubei.descriptionFromVideoResponse(videoResponse)
    if (!description) {
        return []
    }

    const tsContexts = getTimestampContexts(description)
    return tsContexts.length >= MIN_NUM_CHAPTERS ? tsContexts : []
}

async function fetchChaptersFromComments(videoResponse) {
    const comments = await youtubei.fetchComments(videoResponse)
    const pinnedComment = comments.find((comment) => comment.isPinned)
    if (!pinnedComment) {
        return []
    }

    const tsContexts = getTimestampContexts(pinnedComment.text)

    return tsContexts.length >= MIN_NUM_CHAPTERS ? tsContexts : []
}


function getTimestampContexts(text) {
    const timestampPattern = /^((?:\d?\d:)?(?:\d?\d:)\d\d)\s(.+)$/
    const chapters = []
    const lines = text.split(/\r?\n/)

    for (const line of lines) {
        const tsMatch = line.match(timestampPattern)
        if (tsMatch) {
            const timestamp = tsMatch[1]
            const title = tsMatch[2]
            const time = youtubei.parseTimestamp(timestamp)    
            chapters.push({ title, timestamp, time })
        }
    }

    return chapters
}
