'use strict';

angular.module('bahmni.common.domain')
    .factory('locationService', ['$http', '$bahmniCookieStore', 'appService', function ($http, $bahmniCookieStore, appService) {
        var getAllByTag = function (tags, operator) {
            var userInSession = $bahmniCookieStore.get(Bahmni.Common.Constants.currentUser);
            if (userInSession) {
                var restrictLocationToUser = (appService.getAppDescriptor() && appService.getAppDescriptor().getConfigValue('restrictLocationToUser')) || false;
                if (restrictLocationToUser) {
                    return getLoginUserLocations(tags);
                }
            }
            return $http.get(Bahmni.Common.Constants.locationUrl, {
                params: {s: "byTags", tags: tags || "", v: "default", operator: operator || "ALL"},
                cache: true
            });
        };

        var getByUuid = function (locationUuid) {
            return $http.get(Bahmni.Common.Constants.locationUrl + "/" + locationUuid, {
                cache: true
            }).then(function (response) {
                return response.data;
            });
        };

        var getLoggedInLocation = function () {
            var cookie = $bahmniCookieStore.get(Bahmni.Common.Constants.locationCookieName);
            return getByUuid(cookie.uuid);
        };

        var getVisitLocation = function (locationUuid) {
            return $http.get(Bahmni.Common.Constants.bahmniVisitLocationUrl + "/" + locationUuid, {
                headers: {"Accept": "application/json"}
            });
        };

        var getLoginUserLocations = function (byTag) {
            return $http.get(Bahmni.Common.Constants.distroLoginUserLocationsUrl, {
                params: {byTag: byTag || ""}
            });
        };

        return {
            getAllByTag: getAllByTag,
            getLoggedInLocation: getLoggedInLocation,
            getByUuid: getByUuid,
            getVisitLocation: getVisitLocation
        };
    }]);
