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

export function parseTimestamp(ts) {
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

const MAX_COMMENT_PAGES = 5
const MAX_COMMENTS = 100

const INNERTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
const INNERTUBE_CLIENT_NAME = "WEB"

export async function fetchComments(videoId) {
    console.log('FUNCTION fetchComments');
    const videoResponse = await fetchVideo(videoId)
    console.log('videoResponse =', videoResponse);

    let token = commentsContinuationToken(videoResponse)
    console.log('token =', token);
    if (!token) {
        return []
    }
    const comments = []
    let prevToken
    let pageCount = 0
    while (prevToken !== token && pageCount < MAX_COMMENT_PAGES && comments.length < MAX_COMMENTS) {
        const commentsResponse = await fetchNext(token)
        console.log('commentsResponse =', commentsResponse);

        prevToken = token
        const items = pageCount === 0
            ? commentsResponse.onResponseReceivedEndpoints[1].reloadContinuationItemsCommand.continuationItems
            : commentsResponse.onResponseReceivedEndpoints[0].appendContinuationItemsAction.continuationItems
        if (!items) {
            break
        }
        for (const item of items) {
            if (item.commentThreadRenderer) {
                const cr = item.commentThreadRenderer.comment.commentRenderer
                const authorName = cr.authorText.simpleText
                const authorAvatar = cr.authorThumbnail.thumbnails[0].url
                const text = cr.contentText.runs
                    .map(run => run.text)
                    .join("")
                comments.push({
                    authorName,
                    authorAvatar,
                    text
                })
            } else if (item.continuationItemRenderer) {
                token = item.continuationItemRenderer.continuationEndpoint.continuationCommand.token
            }
        }
        pageCount++
    }
    return comments
}

function commentsContinuationToken(videoResponse) {
    return videoResponse.find(e => e.response).response
        .contents.twoColumnWatchNextResults.results.results
        .contents.find(e => e.itemSectionRenderer && e.itemSectionRenderer.sectionIdentifier === 'comment-item-section').itemSectionRenderer
        .contents[0].continuationItemRenderer// When comments are disabled there is messageRenderer instead.
        ?.continuationEndpoint.continuationCommand.token
}

async function fetchNext(continuation) {
    const body = {
        context: {
            client: {
                clientName: INNERTUBE_CLIENT_NAME,
                clientVersion: INNERTUBE_CLIENT_VERSION
            }
        },
        continuation
    }
    const response = await fetch(`https://www.youtube.com/youtubei/v1/next?key=${INNERTUBE_API_KEY}`, {
        method: "POST",
        credentials: "omit",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    })

    console.log('response =', response)

    // const responseObj = await response.text()
    const responseObj = await response.json()
    console.log('responseObj =', responseObj)
    // return await response.json()
    return responseObj;
}
