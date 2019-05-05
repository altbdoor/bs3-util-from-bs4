(function (Sass) {
    Sass.setWorkerUrl('js/sass.worker.js')

    const form = $('#generator-form')
    const processModal = $('#process-modal')

    $(form).on('submit', (e) => {
        e.preventDefault()

        $(processModal).modal('show')

        const sha = $('#form-sha').val()
        const colorNames = [
            'primary', 'success', 'info', 'warning', 'danger',
        ]
        const colors = colorNames.reduce((acc, val) => {
            acc[val] = $(`#form-color-${val}`).val()
            return acc
        }, {})

        const nestedFilesPromise = ['mixins', 'utilities'].map((filename) => {
            return $.get(`https://cdn.jsdelivr.net/gh/twbs/bootstrap@${sha}/scss/_${filename}.scss`).then((data) => {
                return data.split('\n').filter((line) => (
                    line.startsWith(`@import "${filename}/`)
                )).map((line) => (
                    line.replace(`@import "`, '').replace('";', '').trim()
                ))
            })
        })

        const flattedFilesPromise = whenPromise(nestedFilesPromise).then((mixinList, utilList) => {
            const mixinFiles = mixinList.map((mixin) => {
                mixin = mixin.replace('/', '/_')
                return $.get(`https://cdn.jsdelivr.net/gh/twbs/bootstrap@${sha}/scss/${mixin}.scss`).then((data) => data)
            })

            const utilFiles = utilList.map((util) => {
                util = util.replace('/', '/_')
                return $.get(`https://cdn.jsdelivr.net/gh/twbs/bootstrap@${sha}/scss/${util}.scss`).then((data) => data)
            })

            return $.when(whenPromise(mixinFiles), whenPromise(utilFiles))
        }).then((mixinData, utilData) => {
            return $.when(mixinData.join('\n'), utilData.join('\n'))
        })

        const simpleFiles = ['functions', 'variables'].map((filename) => {
            return $.get(`https://cdn.jsdelivr.net/gh/twbs/bootstrap@${sha}/scss/_${filename}.scss`).then((data) => data)
        })

        $.when(whenPromise(simpleFiles), flattedFilesPromise).then((simpleData, flattedData) => {
            let content = ''
            content += simpleData.join('\n')

            content += `
$grid-breakpoints: (
    xs: 0,
    sm: 768px,
    md: 992px,
    lg: 1200px,
);

$primary:   #${colors['primary']};
$success:   #${colors['success']};
$info:      #${colors['info']};
$warning:   #${colors['warning']};
$danger:    #${colors['danger']};

$theme-colors: (
    "primary":    $primary,
    "success":    $success,
    "info":       $info,
    "warning":    $warning,
    "danger":     $danger
);`
            content += flattedData.join('\n')

            const sassInstance = new Sass()
            sassInstance.compile(
                content,
                { style: Sass.style.expanded },
                function(result) {
                    $('#output-text').val(result.text)
                    $(processModal).modal('hide')
                    sassInstance.destroy()
                }
            )
        })
    })

    function whenPromise(promise) {
        return $.when.apply($, promise)
    }

})(Sass)
