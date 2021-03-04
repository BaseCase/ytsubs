document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('start').addEventListener('click', start)
})

function start() {
  gapi.load('client:auth2', initGoogleAPI)
}

function initGoogleAPI() {
  gapi.client.init({
    clientId: '535713324276-4dufi4pmkts4vl0ufvfo0vigqan6jcsv.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
  }).then(() => {
    const authInstance = gapi.auth2.getAuthInstance()
    if (!authInstance.isSignedIn.get()) {
      authInstance.isSignedIn.listen(() => requestSubscriptionData([]))
      signIn()
    } else {
      requestSubscriptionData([])
    }
  })
}

function signIn() {
  document.getElementById('status').innerText = "Signing in..."
  gapi.auth2.getAuthInstance().signIn()
}

function requestSubscriptionData(subscriptions, nextPageToken) {
  document.getElementById('status').innerText = "Fetching YT subscription data..."

  gapi.client.request({
    method: 'GET',
    path: '/youtube/v3/subscriptions',
    params: {
      mine: true,
      part: 'snippet',
      maxResults: 50,
      pageToken: nextPageToken || '',
    },
  }).execute((res) => onSubscriptionData(res, subscriptions))
}

function onSubscriptionData(response, subscriptions) {
  const subs = subscriptions.concat(response.items)
  if (response.nextPageToken) {
    requestSubscriptionData(subs, response.nextPageToken)
  } else {
    generateRSSFeeds(subs)
  }
}

function generateRSSFeeds(subscriptions) {
  document.getElementById('status').innerText = "Data fetched, building OPML file..."

  const baseXML = "https://www.youtube.com/feeds/videos.xml?channel_id="
  const baseHTML = "https://www.youtube.com/channel/"

  function singleSubscriptionXML(sub) {
    const id = sub.snippet.resourceId.channelId
    const title = sub.snippet.title
    return [
      '<outline',
      `text="${title}"`,
      `title="${title}"`,
      'type="rss"',
      `xmlUrl="${baseXML + id}"`,
      `htmlUrl="${baseHTML + id}"`,
      '/>',
    ].join(' ')
  }

  let xml =
`<opml version="1.0">
  <head>
    <title>RSS feeds from YouTube Subscriptions</title>
  </head>
  <body>
    <outline text="YouTube Subscriptions" title="YouTube Subscriptions">
${subscriptions.map(s => '      ' + singleSubscriptionXML(s)).join('\n')}
    </outline>
  </body>
</opml>`

  const xmlEl = document.getElementById('opml')
  xmlEl.innerText = xml
  xmlEl.classList.remove('hidden')

  const downloadLink = document.getElementById('download')
  downloadLink.href= 'data:text/xml;charset=utf8,' + encodeURI(xml)
  downloadLink.target = '_blank'
  downloadLink.download = 'YouTube Subscriptions.xml'
  downloadLink.classList.remove('hidden')

  document.getElementById('status').innerText = "Done!"
}
