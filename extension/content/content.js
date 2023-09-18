main()

onLocationHrefChange(() => {
    removeChaptersControls()
    main()
})

async function main() {
    const videoId = getVideoId()
    if (!videoId) {
        return
    }

    const chapters = await fetchChapters(videoId)

    if (videoId !== getVideoId()) {
        return
    }
    
    if (chapters && chapters.length > 0) {
        createChaptersControls(chapters)
    }
}

document.addEventListener('click', e => {
    const chapterButton = e.target.closest('#__youtube-chapters-in-player__button')
    if (chapterButton) {
        toggleChaptersMenuVisibility()
    } else {
        hideChaptersMenu()
    }
}, true)

let timeupdateListener = null

function createChaptersControls(chapters) {
    createChaptersButton(chapters)
    createChaptersMenu(chapters)

    let currentChapterIndex = null
    timeupdateListener = () => {
        const chapterIndex = getCurrentChapterIndex(chapters)
        if (currentChapterIndex !== chapterIndex) {
            currentChapterIndex = chapterIndex
            selectChaptersMenuItemAtIndex(currentChapterIndex)
            setChaptersMenuButtonText(chapters[currentChapterIndex]?.title)
        }
    }
    getVideo().addEventListener('timeupdate', timeupdateListener)
}

function removeChaptersControls() {
    removeChaptersButton()
    removeChaptersMenu()

    if (timeupdateListener) {
        const video = getVideo()
        if (video) {
            video.removeEventListener('timeupdate', timeupdateListener)
        }
        timeupdateListener = null
    }
}

function getChaptersButton() {
    return document.querySelector('#__youtube-chapters-in-player__button')
}

function createChaptersButton(chapters) {
    const chaptersContainer = document.createElement('div')
    chaptersContainer.id = '__youtube-chapters-in-player__button'
    chaptersContainer.classList.add('ytp-chapter-container')
    document.querySelector('#movie_player .ytp-left-controls').appendChild(chaptersContainer)

    const button = document.createElement('button')
    button.classList.add('ytp-button')
    button.classList.add('ytp-chapter-title')
    chaptersContainer.appendChild(button)

    const dot = document.createElement('span')
    dot.classList.add('ytp-chapter-title-prefix')
    dot.setAttribute('aria-hidden', 'true')
    dot.textContent = '•'
    button.appendChild(dot)

    const content = document.createElement('div')
    content.classList.add('ytp-chapter-title-content')
    button.appendChild(content)

    setChaptersMenuButtonText(chapters[getCurrentChapterIndex(chapters)]?.title)
}

function setChaptersMenuButtonText(text) {
    const buttonContent = document.querySelector('#__youtube-chapters-in-player__button .ytp-chapter-title-content')
    if (buttonContent) {
        buttonContent.textContent = text ? text : 'Chapters'
    }
}

function removeChaptersButton() {
    const chaptersButton = getChaptersButton()
    if (chaptersButton) {
        chaptersButton.remove()
    }
}

function getChaptersMenu() {
    return document.querySelector('#__youtube-chapters-in-player__menu')
}

function createChaptersMenu(chapters) {
    const chaptersMenu = document.createElement('div')
    chaptersMenu.id = '__youtube-chapters-in-player__menu'
    chaptersMenu.classList.add('ytp-popup')
    chaptersMenu.style.display = 'none'
    document.querySelector('#movie_player').appendChild(chaptersMenu)

    const panelElement = document.createElement('div')
    panelElement.classList.add('ytp-panel')
    chaptersMenu.appendChild(panelElement)

    const menuElement = document.createElement('div')
    menuElement.classList.add('ytp-panel-menu')
    panelElement.appendChild(menuElement)

    for (const chapter of chapters) {
        menuElement.appendChild(toChapterElement(chapter))
    }

    const chapterIndex = getCurrentChapterIndex(chapters)
    selectChaptersMenuItemAtIndex(chapterIndex)


    const buttons = document.createElement('div')
    buttons.id = '__youtube-chapters-in-player__menu__buttons'
    chaptersMenu.appendChild(buttons)

    const prevChapterButton = document.createElement('button')
    prevChapterButton.id = '__youtube-chapters-in-player__menu__buttons__prev'
    prevChapterButton.classList.add('ytp-button')
    prevChapterButton.classList.add('ytp-menuitem')
    prevChapterButton.textContent = '<'
    prevChapterButton.addEventListener('click', e => {
        const chapterIndex = getCurrentChapterIndex(chapters)
        if (chapterIndex <= 0) {
            return
        }
        const chapter = chapters[chapterIndex - 1]
        getVideo().currentTime = chapter.time
    })
    buttons.appendChild(prevChapterButton)

    const nextChapterButton = document.createElement('button')
    nextChapterButton.id = '__youtube-chapters-in-player__menu__buttons__next'
    nextChapterButton.classList.add('ytp-button')
    nextChapterButton.classList.add('ytp-menuitem')
    nextChapterButton.textContent = '>'
    nextChapterButton.addEventListener('click', e => {
        const chapterIndex = getCurrentChapterIndex(chapters)
        if (chapterIndex >= chapters.length - 1) {
            return
        }
        const chapter = chapters[chapterIndex + 1]
        getVideo().currentTime = chapter.time
    })
    buttons.appendChild(nextChapterButton)
}

function toChapterElement(chapter) {
    const itemElement = document.createElement('div')
    itemElement.classList.add('ytp-menuitem')
    itemElement.addEventListener('click', e => {
        getVideo().currentTime = chapter.time
    })

    const iconElement = document.createElement('div')
    iconElement.classList.add('ytp-menuitem-icon')
    itemElement.appendChild(iconElement)

    const labelElement = document.createElement('div')
    labelElement.classList.add('ytp-menuitem-label')
    labelElement.textContent = chapter.title
    itemElement.appendChild(labelElement)

    const contentElement = document.createElement('div')
    contentElement.classList.add('ytp-menuitem-content')
    contentElement.textContent = chapter.timestamp
    itemElement.appendChild(contentElement)

    return itemElement
}

function selectChaptersMenuItemAtIndex(chapterIndex) {
    const chaptersMenu = getChaptersMenu()
    if (!chaptersMenu) {
        return
    }
    const menuItems = chaptersMenu.querySelectorAll('.ytp-menuitem')
    for (let i = 0; i < menuItems.length; i++) {
        const menuItem = menuItems[i]
        if (i === chapterIndex) {
            menuItem.setAttribute('aria-checked', 'true')
        } else {
            menuItem.removeAttribute('aria-checked')
        }
    }
}

function removeChaptersMenu() {
    const chaptersMenu = getChaptersMenu()
    if (chaptersMenu) {
        chaptersMenu.remove()
    }
}

function toggleChaptersMenuVisibility() {
    if (isChaptersMenuVisible()) {
        hideChaptersMenu()
    } else {
        showChaptersMenu()
        adjustChaptersMenuSize()
        scrollChaptersMenuToCurrentChapter()
    }
}

function isChaptersMenuVisible() {
    const chaptersMenu = getChaptersMenu()
    return chaptersMenu && !chaptersMenu.style.display
}

function showChaptersMenu() {
    const chaptersMenu = getChaptersMenu()
    if (chaptersMenu) {
        chaptersMenu.style.display = ''
    }
}

function hideChaptersMenu() {
    const chaptersMenu = getChaptersMenu()
    if (chaptersMenu) {
        chaptersMenu.style.display = 'none'
    }
}

function adjustChaptersMenuSize() {
    const chaptersMenu = getChaptersMenu()
    if (!chaptersMenu) {
        return
    }
    const menuHeight = chaptersMenu.querySelector('.ytp-panel-menu').clientHeight
    const buttonsHeight = chaptersMenu.querySelector('#__youtube-chapters-in-player__menu__buttons').clientHeight
    chaptersMenu.style.height = (menuHeight + buttonsHeight) + 'px'
}

function scrollChaptersMenuToCurrentChapter() {
    const chaptersMenu = getChaptersMenu()
    if (!chaptersMenu) {
        return
    }
    const menuItem = chaptersMenu.querySelector('.ytp-menuitem[aria-checked="true"]')
    if (menuItem && menuItem.offsetParent !== null) {
        const panel = chaptersMenu.querySelector('.ytp-panel')
        panel.scrollTop = menuItem.offsetTop
    }
}

function getVideo() {
    return document.querySelector('#movie_player video')
}

function getCurrentChapterIndex(chapters) {
    const currentTime = getVideo().currentTime
    return getChapterIndex(chapters, currentTime)
}

function getChapterIndex(chapters, time) {
    for (let i = chapters.length - 1; i >= 0; i--) {
        if (time >= chapters[i].time) {
            return i
        }
    }
    return -1
}

function fetchChapters(videoId) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'fetchChapters', videoId }, resolve)
    })
}

function getVideoId() {
    if (window.location.pathname == '/watch') {
        return parseParams(window.location.href)['v']
    } else if (window.location.pathname.startsWith('/embed/')) {
        return window.location.pathname.substring('/embed/'.length)
    } else {
        return null
    }
}

function parseParams(href) {
    const noHash = href.split('#')[0]
    const paramString = noHash.split('?')[1]
    const params = {}
    if (paramString) {
        const paramsArray = paramString.split('&')
        for (const kv of paramsArray) {
            const tmparr = kv.split('=')
            params[tmparr[0]] = tmparr[1]
        }
    }
    return params
}

function onLocationHrefChange(callback) {
    let currentHref = document.location.href
    const observer = new MutationObserver(() => {
        if (currentHref != document.location.href) {
            currentHref = document.location.href
            callback()
        }
    })
    observer.observe(document.querySelector("body"), { childList: true, subtree: true })
}
