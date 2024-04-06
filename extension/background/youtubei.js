const INNERTUBE_CLIENT_VERSION = "2.20211129.09.00"

const engagementPanelIds = [
    'engagement-panel-macro-markers-description-chapters',
    'engagement-panel-macro-markers-auto-chapters'
]

export function chaptersFromVideoResponse(videoResponse) {
    console.log('function chaptersFromVideoResponse :: videoResponse =', videoResponse)

    // const result = videoResponse.find(e => e.response).response
    const result = videoResponse.response
        .engagementPanels.find(e => e.engagementPanelSectionListRenderer && engagementPanelIds.includes(e.engagementPanelSectionListRenderer.panelIdentifier))
        ?.engagementPanelSectionListRenderer.content.macroMarkersListRenderer.contents
        .map(content => content.macroMarkersListItemRenderer ? macroMarkersListItemRendererToChapter(content.macroMarkersListItemRenderer) : null)
        .filter(e => e ? true : false)

    return result ? result : []
}

export function lengthSecondsFromVideoResponse(videoResponse) {
    console.log('function lengthSecondsFromVideoResponse :: videoResponse =', videoResponse)
    // const { playerResponse } = videoResponse.find((item) => item.playerResponse)
    const { playerResponse } = videoResponse
    const { lengthSeconds } = playerResponse.microformat.playerMicroformatRenderer
    return lengthSeconds
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

export async function fetchVideo(videoId) {
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

const INNERTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
const INNERTUBE_CLIENT_NAME = "WEB"

export async function fetchComments(videoResponse) {
    const token = commentsContinuationToken(videoResponse)
    if (!token) {
        console.log('youtubei.js :: function fetchComments :: No token!!!')
        return []
    }
    const commentsResponse = await fetchNext(token)
    console.log('youtubei.js :: function fetchComments :: commentsResponse =', commentsResponse)

    const items = commentsResponse?.frameworkUpdates?.entityBatchUpdate?.mutations

    // const items = commentsResponse.onResponseReceivedEndpoints[1].reloadContinuationItemsCommand.continuationItems
    if (!items) {
        console.log('youtubei.js :: function fetchComments :: No items!!!')
        return []
    }
    console.log('youtubei.js :: function fetchComments :: items =', items)

    const comments = []

    for (const item of items) {
        // cr = commentRenderer // Historically, but changed somewhere in April 2024 or before
        // const cr = item?.commentThreadRenderer?.comment?.commentRenderer
        // const cr = item?.payload?.commentEntityPayload?.properties?.content?.content
        // if (!cr) {
        //     console.log('cr not found!!! :: item =', item)
        //     continue
        // }
        // console.log('cr = ', cr)

        const commentText = item?.payload?.commentEntityPayload?.properties?.content?.content
        if (!commentText) {
            console.log('commentText not found!!! :: item =', item)
            continue
        }
        console.log('item = ', item)
        console.log('commentText = ', commentText)

        comments.push({ text: commentText, isPinned: false })

        /*
        const isPinned = cr.pinnedCommentBadge;
        const text = cr.contentText.runs
            .map(run => run.text)
            .join("")
        comments.push({ text, isPinned })
        */
    }

    console.log('comments =', comments)

    return comments
}

function commentsContinuationToken(videoResponse) {
    // if (!(find in videoResponse)) {
    //     console.log('function commentsContinuationToken :: No find in videoResponse !!!')
    //     return null
    // }

    // return videoResponse.find(e => e.response).response
    return videoResponse.response
        .contents.twoColumnWatchNextResults.results.results
        .contents.find(e => e.itemSectionRenderer && e.itemSectionRenderer.sectionIdentifier === 'comment-item-section').itemSectionRenderer
        .contents[0].continuationItemRenderer // When comments are disabled there is messageRenderer instead.
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

    return await response.json()
}

