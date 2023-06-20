'use strict';

angular.module('bahmni.common.orders')
    .factory('orderService', ['$http', '$bahmniCookieStore', 'appService', function ($http, $bahmniCookieStore, appService) {
        var getOrders = function (data) {
            var params = {
                concept: data.conceptNames,
                includeObs: data.includeObs,
                patientUuid: data.patientUuid,
                numberOfVisits: data.numberOfVisits
            };

            if (data.obsIgnoreList) {
                params.obsIgnoreList = data.obsIgnoreList;
            }
            if (data.orderTypeUuid) {
                params.orderTypeUuid = data.orderTypeUuid;
            }
            if (data.orderUuid) {
                params.orderUuid = data.orderUuid;
            }
            if (data.visitUuid) {
                params.visitUuid = data.visitUuid;
            }
            if (data.locationUuids && data.locationUuids.length > 0) {
                params.numberOfVisits = 0;
                params.locationUuids = data.locationUuids;
            }
            var orderUrl = Bahmni.Common.Constants.bahmniOrderUrl;
            var userInSession = $bahmniCookieStore.get(Bahmni.Common.Constants.currentUser);
            if (userInSession) {
                var restrictLocationToUser = (appService.getAppDescriptor() && appService.getAppDescriptor().getConfigValue('restrictLocationToUser')) || false;
                if (restrictLocationToUser) {
                    orderUrl = Bahmni.Common.Constants.bahmniDistroOrderUrl;
                }
            }
            return $http.get(orderUrl, {
                params: params,
                withCredentials: true
            });
        };

        return {
            getOrders: getOrders
        };
    }]);
