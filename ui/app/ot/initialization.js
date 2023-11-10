'use strict';

angular.module('bahmni.ot').factory('initialization', ['$rootScope', '$q', '$http', 'surgicalAppointmentHelper', 'appService', 'surgicalAppointmentService', 'authenticator', 'spinner',
    function ($rootScope, $q, $http, surgicalAppointmentHelper, appService, surgicalAppointmentService, authenticator, spinner) {
        var initApp = function () {
            return appService.initApp('ot', {'app': true, 'extension': true}).then(function (data) {
                var providerNames = data.getConfigValue("primarySurgeonsForOT");
                return $q.all([getSurgeons(), surgicalAppointmentService.getSurgicalAppointmentAttributeTypes()]).then(function (response) {
                    $rootScope.attributeTypes = response[1].data.results;
                    return response;
                });
            });
        };

        var getSurgeons = function () {
            $rootScope.surgeons = [];
            return surgicalAppointmentService.getSurgeons().then(function (response) {
                $rootScope.surgeons = $rootScope.surgeons.concat(surgicalAppointmentHelper.filterSurgeons(response.data.results));
                if (response.data.links != null) {
                    var nextURILink = response.data.links.find(function (link) {
                        return link.rel === "next";
                    });
                    return getRemainingSurgeons(nextURILink);
                }
            });
        };

        var getRemainingSurgeons = function (nextURILink) {
            if (nextURILink != null) {
                var nextURI = nextURILink.uri;
                if (nextURI != null) {
                    return $http.get(nextURI, {
                        method: "GET",
                        withCredentials: true
                    }).then(function (nextResponse) {
                        var nextURILink = nextResponse.data.links.find(function (link) {
                            return link.rel === "next";
                        });
                        $rootScope.surgeons = $rootScope.surgeons.concat(surgicalAppointmentHelper.filterSurgeons(nextResponse.data.results));
                        return getRemainingSurgeons(nextURILink);
                    });
                }
            }
        };
        return spinner.forPromise(authenticator.authenticateUser().then(initApp));
    }
]);
