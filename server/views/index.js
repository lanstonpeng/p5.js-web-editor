export function renderIndex() {
  const assetsManifest = process.env.webpackAssets && JSON.parse(process.env.webpackAssets);
  const chunkManifest = process.env.webpackChunkAssets && JSON.parse(process.env.webpackChunkAssets);

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <title>CodingMonkey p5.js Web Editor</title>
      ${process.env.NODE_ENV === 'production' ? `<link rel='stylesheet' href='/dist/${assetsManifest['/app.css']}' />` : ''}
      <link href='https://fonts.googleapis.com/css?family=Inconsolata' rel='stylesheet' type='text/css'>
      <link href='https://fonts.googleapis.com/css?family=Montserrat:400,700' rel='stylesheet' type='text/css'>
      <link rel='shortcut icon' href='https://raw.githubusercontent.com/processing/p5.js-website-OLD/master/favicon.ico' type='image/x-icon'/ >
      <script type='text/javascript'>
        var _vds = _vds || [];
        window._vds = _vds;
        (function(){
          _vds.push(['setAccountId', '8914248c7189ecb9']);
          (function() {
            var vds = document.createElement('script');
            vds.type='text/javascript';
            vds.async = true;
            vds.src = ('https:' == document.location.protocol ? 'https://' : 'http://') + 'dn-growing.qbox.me/vds.js';
            var s = document.getElementsByTagName('script')[0];
            s.parentNode.insertBefore(vds, s);
          })();
        })();
      </script>
    </head>
    <body>
      <div id="root" class="root-app">
      </div>
      <script>
          ${process.env.NODE_ENV === 'production' ?
          `//<![CDATA[
          window.webpackManifest = ${JSON.stringify(chunkManifest)};
          //]]>` : ''}
        </script>
        <script src='${process.env.NODE_ENV === 'production' ? `/dist${assetsManifest['/vendor.js']}` : '/dist/vendor.js'}'></script>
        <script src='${process.env.NODE_ENV === 'production' ? `/dist${assetsManifest['/app.js']}` : '/dist/app.js'}'></script>
    </body>
  </html>
  `;
}
