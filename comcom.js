var BASE_URL = 'http://latestbuilds.hq.couchbase.com/couchbase-server/';
var RELEASE = 'sherlock';


$(document).ready(function() {
    $('#compare-builds').on('click', function() {
        var buildA = $('#build-a').val();
        var buildB = $('#build-b').val();
        console.log('submit', buildA, buildB);
        window.location.hash = '#' + RELEASE + '/' + buildA + '...' + buildB;
        return false;
    });
});


var appendEntry = function(name, url, text) {
    var entry = '<li>' + name + ': ';
    if (url) {
        entry += '<a href="' + url + '">' + text + '</a>';
    }
    else {
        entry += text;
    }
    entry += '</li>';

    $('#projects').append(entry);
}



var diffLinks = function(remotes, projects) {
    $('#loading').hide();
    for (name in projects) {
        var project = projects[name];
        var url;
        var text;

        if (project.revA !== project.revB) {
            if (project.remoteA !== project.remoteB) {
                text = "Can't compare projects on different repositories";
                url = '';
            }
            else {
                text = project.revA + '...' + project.revB;
                url = remotes[project.remoteA] + name + '/compare/' + text;
            }
        }
        else {
            text = project.revA;
            url = remotes[project.remoteA]  + name + '/commit/' + text;
        }

        appendEntry(name, url, text);
    };
}


// NOTE vmx 2015-08-05: This specific to the Sherlock release
// but makes the user experience better as you only need to know
// the build number, but not which release version it is.
var getVersion = function(build) {
    if (build < 4500) {
        return '4.0.0'
    }
    else {
        return '4.0.1'
    }
}


var cleanup = function() {
    $('#projects').empty();
    $('#errors').empty();
    $('#loading').show();
}


var compareBuilds = function() {
    if (window.location.hash.length > 0) {
        cleanup();
        var releaseHash = '#' + RELEASE + '/';
        var builds = window.location.hash.substr(releaseHash.length)
            .split('.');
        var buildA = parseInt(builds[0]);
        var buildB = parseInt(builds[builds.length - 1]);
        console.log('builds:', buildA, buildB);

        $('#build-a').val(buildA);
        $('#build-b').val(buildB);

        var versionA = getVersion(buildA);
        var versionB = getVersion(buildB);

        var manifestUrlA = BASE_URL + RELEASE + '/' + buildA + '/' +
            'couchbase-server-' + versionA + '-' + buildA + '-manifest.xml';
        console.log(manifestUrlA);

        var manifestA = $.get(manifestUrlA);
        manifestA.error( function(foo) {
            console.log(foo);
            $('#loading').hide();
            $('#errors').append('<li>No manifest for build ' + buildA +
                                ' found.</li>');
        })
        var manifestUrlB = BASE_URL + RELEASE + '/' + buildB + '/' +
            'couchbase-server-' + versionB + '-' + buildB + '-manifest.xml';
        console.log(manifestUrlB);
        var manifestB = $.get(manifestUrlB);
        manifestB.error(function(foo) {
            console.log(foo);
            $('#loading').hide();
            $('#errors').append('<li>No manifest for build ' + buildB +
                                ' found.</li>');
        })

        $.when(manifestA, manifestB).done(function(respA, respB) {
            console.log(respA);
            console.log(respB);
            var rootA = $(respA[0].children)
            var rootB = $(respB[0].children)

            var remotes = {};
            rootA.children('remote').each(function(i, remote) {
                console.log(remote);
                var name = $(remote).attr('name');
                var url = 'https://' + $(remote).attr('fetch')
                    .replace('git://', '').replace('ssh://git@', '');
                remotes[name] = url;
            });
            console.log(remotes);

            var defaultRemoteA = rootA.children('default').first()
                .attr('remote');
            var defaultRemoteB = rootB.children('default').first()
                .attr('remote');

            var projects = {};
            rootA.children('project').each(function(i, project) {
                //console.log(project);
                var name = $(project).attr('name');
                var rev = $(project).attr('revision');
                var remote = $(project).attr('remote') || defaultRemoteA;
                projects[name] = projects[name] || {};
                projects[name].revA = rev
                projects[name].remoteA = remote
            });
            var projectsB = {};
            rootB.children('project').each(function(i, project) {
                var name = $(project).attr('name');
                var rev = $(project).attr('revision');
                var remote = $(project).attr('remote') || defaultRemoteB;
                projects[name] = projects[name] || {};
                projects[name].revB = rev
                projects[name].remoteB = remote
            });
            console.log(projects);
            diffLinks(remotes, projects);
        })
    }
}


$(window).on('hashchange', function () {
        compareBuilds();
});

compareBuilds();
