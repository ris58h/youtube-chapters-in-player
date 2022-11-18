const INNERTUBE_CLIENT_VERSION = "2.20211129.09.00"

export async function fetchChapters(videoId) {
    const videoResponse = await fetchVideo(videoId)
    return chaptersFromVideoResponse(videoResponse)
}

const engagementPanelIds = [
    'engagement-panel-macro-markers-description-chapters',
    'engagement-panel-macro-markers-auto-chapters'
]

function chaptersFromVideoResponse(videoResponse) {
    const result = videoResponse.find(e => e.response).response
        .engagementPanels.find(e => e.engagementPanelSectionListRenderer && engagementPanelIds.includes(e.engagementPanelSectionListRenderer.panelIdentifier))
        ?.engagementPanelSectionListRenderer.content.macroMarkersListRenderer.contents
        .map(content => content.macroMarkersListItemRenderer ? macroMarkersListItemRendererToChapter(content.macroMarkersListItemRenderer) : null)
        .filter(e => e ? true : false)
    return result ? result : []
}

function macroMarkersListItemRendererToChapter(renderer) {
    const title = renderer.title.simpleText
    const timestamp = renderer.timeDescription.simpleText
    const time = parseTimestamp(timestamp)
    return {
        title,
        timestamp,
        time
    }
}

async function fetchVideo(videoId) {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}&pbj=1`, {
        credentials: "omit",
        headers: {
            "X-Youtube-Client-Name": "1",
            "X-Youtube-Client-Version": INNERTUBE_CLIENT_VERSION
        }
    })
    return await response.json()
}

function parseTimestamp(ts) {
    const parts = ts.split(':').reverse()
    const secs = parseInt(parts[0])
    if (secs > 59) {
        return null
    }
    const mins = parseInt(parts[1])
    if (mins > 59) {
        return null
    }
    const hours = parseInt(parts[2]) || 0
    return secs + (60 * mins) + (60 * 60 * hours)
}

// time-comments related code below

export async function fetchTimeComments(videoId) {
    const comments = await fetchComments(videoId)
    console.log('FUNCTION fetchTimeComments :: comments =', comments)
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
    return await fetchComments(videoId)
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
        const time = parseTimestamp(timestamp)
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