'use strict';

Bahmni.Common.Util.stringCompressionUtil = {

// https://pieroxy.net/blog/pages/lz-string/index.html
// https://github.com/pieroxy/lz-string/

    encodeCompress: function (inputStr) {
        if (!inputStr) return "";
        if (inputStr == "") return "";
        var compressed = LZString.compressToEncodedURIComponent(inputStr);
        return compressed;
    },

    decodeDecompress: function (inputStr) {
        if (!inputStr) return "";
        if (inputStr == "") return "";
        try {
            var decompressed = LZString.decompressFromEncodedURIComponent(inputStr);
            if ((!decompressed || decompressed.length == 0) && inputStr.includes("%")) {
                return decodeURIComponent(inputStr);
            }
            return decompressed || inputStr;
        } catch (error) {
            return decodeURIComponent(inputStr);
        }
    }

};
