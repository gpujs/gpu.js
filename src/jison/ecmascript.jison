%lex

DecimalDigit [0-9]
DecimalDigits [0-9]+
NonZeroDigit [1-9]
OctalDigit [0-7]
HexDigit [0-9a-fA-F]
UnicodeIdentifierStart [\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]
UnicodeIdentifierPart [\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc0-9\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19b0-\u19c0\u19c8\u19c9\u19d0-\u19d9\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1dc0-\u1de6\u1dfc-\u1dff\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8e0-\ua8f1\ua900-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f]
IdentifierStart {UnicodeIdentifierStart}|[$_a-zA-Z]|("\\"[u]{HexDigit}{4})
IdentifierPart {IdentifierStart}|{UnicodeIdentifierPart}|[0-9]
Identifier {IdentifierStart}{IdentifierPart}*
ExponentIndicator [eE]
SignedInteger [+-]?[0-9]+
DecimalIntegerLiteral [0]|({NonZeroDigit}{DecimalDigits}*)
ExponentPart {ExponentIndicator}{SignedInteger}
OctalIntegerLiteral [0]{OctalDigit}+
HexIntegerLiteral [0][xX]{HexDigit}+
DecimalLiteral ({DecimalIntegerLiteral}\.{DecimalDigits}*{ExponentPart}?)|(\.{DecimalDigits}{ExponentPart}?)|({DecimalIntegerLiteral}{ExponentPart}?)
LineContinuation \\(\r\n|\r|\n)
OctalEscapeSequence (?:[1-7][0-7]{0,2}|[0-7]{2,3})
HexEscapeSequence [x]{HexDigit}{2}
UnicodeEscapeSequence [u]{HexDigit}{4}
SingleEscapeCharacter [\'\"\\bfnrtv]
NonEscapeCharacter [^\'\"\\bfnrtv0-9xu]
CharacterEscapeSequence {SingleEscapeCharacter}|{NonEscapeCharacter}
EscapeSequence {CharacterEscapeSequence}|{OctalEscapeSequence}|{HexEscapeSequence}|{UnicodeEscapeSequence}
DoubleStringCharacter ([^\"\\\n\r]+)|(\\{EscapeSequence})|{LineContinuation}
SingleStringCharacter ([^\'\\\n\r]+)|(\\{EscapeSequence})|{LineContinuation}
StringLiteral (\"{DoubleStringCharacter}*\")|(\'{SingleStringCharacter}*\')
RegularExpressionNonTerminator [^\n\r]
RegularExpressionBackslashSequence \\{RegularExpressionNonTerminator}
RegularExpressionClassChar [^\n\r\]\\]|{RegularExpressionBackslashSequence}
RegularExpressionClass \[{RegularExpressionClassChar}*\]
RegularExpressionFlags {IdentifierPart}*
RegularExpressionFirstChar ([^\n\r\*\\\/\[])|{RegularExpressionBackslashSequence}|{RegularExpressionClass}
RegularExpressionChar ([^\n\r\\\/\[])|{RegularExpressionBackslashSequence}|{RegularExpressionClass}
RegularExpressionBody {RegularExpressionFirstChar}{RegularExpressionChar}*
RegularExpressionLiteral {RegularExpressionBody}\/{RegularExpressionFlags}

%x REGEXP
%options flex
%%
<REGEXP>{RegularExpressionLiteral} %{
                                        this.begin("INITIAL");
                                        return "REGEXP_LITERAL";
                                   %}
(\r\n|\r|\n)+\s*"++"               return "BR++"; /* Handle restricted postfix production */
(\r\n|\r|\n)+\s*"--"               return "BR--"; /* Handle restricted postfix production */
\s+                                %{
                                        if (yytext.match(/\r|\n/)) {
                                            parser.newLine = true;
                                        }

                                        if (parser.restricted && parser.newLine) {
                                            this.unput(yytext);
                                            parser.restricted = false;
                                            return ";";
                                        }
                                   %}
"/*"(.|\r|\n)*?"*/"                %{
                                        if (yytext.match(/\r|\n/)) {
                                            parser.newLine = true;
                                        }

                                        if (parser.restricted && parser.newLine) {
                                            this.unput(yytext);
                                            parser.restricted = false;
                                            return ";";
                                        }
                                   %}
"//".*($|\r\n|\r|\n)               %{
                                        if (yytext.match(/\r|\n/)) {
                                            parser.newLine = true;
                                        }

                                        if (parser.restricted && parser.newLine) {
                                            this.unput(yytext);
                                            parser.restricted = false;
                                            return ";";
                                        }
                                   %}
{StringLiteral}                    parser.restricted = false; return "STRING_LITERAL";
"break"                            parser.restricted = true; return "BREAK";
"case"                             return "CASE";
"catch"                            return "CATCH";
"continue"                         parser.restricted = true; return "CONTINUE";
"debugger"                         return "DEBUGGER";
"default"                          return "DEFAULT";
"delete"                           return "DELETE";
"do"                               return "DO";
"else"                             return "ELSE";
"finally"                          return "FINALLY";
"for"                              return "FOR";
"function"                         return "FUNCTION";
"if"                               return "IF";
"in"                               return "IN";
"instanceof"                       return "INSTANCEOF";
"new"                              parser.restricted = false; return "NEW";
"return"                           parser.restricted = true; return "RETURN";
"switch"                           return "SWITCH";
"this"                             parser.restricted = false; return "THIS";
"throw"                            parser.restricted = true; return "THROW";
"try"                              return "TRY";
"typeof"                           parser.restricted = false; return "TYPEOF";
"var"                              return "VAR";
"void"                             parser.restricted = false; return "VOID";
"while"                            return "WHILE";
"with"                             return "WITH";
"true"                             parser.restricted = false; return "TRUE";
"false"                            parser.restricted = false; return "FALSE";
"null"                             parser.restricted = false; return "NULL";
"class"                            return "CLASS";
"const"                            return "CONST";
"enum"                             return "ENUM";
"export"                           return "EXPORT";
"extends"                          return "EXTENDS";
"import"                           return "IMPORT";
"super"                            return "SUPER";
{Identifier}                       parser.restricted = false; return "IDENTIFIER";
{DecimalLiteral}                   parser.restricted = false; return "NUMERIC_LITERAL";
{HexIntegerLiteral}                parser.restricted = false; return "NUMERIC_LITERAL";
{OctalIntegerLiteral}              parser.restricted = false; return "NUMERIC_LITERAL";
"{"                                parser.restricted = false; return "{";
"}"                                return "}";
"("                                parser.restricted = false; return "(";
")"                                return ")";
"["                                parser.restricted = false; return "[";
"]"                                return "]";
"."                                return ".";
";"                                parser.restricted = false; return ";";
","                                return ",";
"?"                                return "?";
":"                                return ":";
"==="                              return "===";
"=="                               return "==";
"="                                return "=";
"!=="                              return "!==";
"!="                               return "!=";
"!"                                parser.restricted = false; return "!";
"<<="                              return "<<=";
"<<"                               return "<<";
"<="                               return "<=";
"<"                                return "<";
">>>="                             return ">>>=";
">>>"                              return ">>>";
">>="                              return ">>=";
">>"                               return ">>";
">="                               return ">=";
">"                                return ">";
"+="                               return "+=";
"++"                               parser.restricted = false; return "++";
"+"                                return "+";
"-="                               return "-=";
"--"                               parser.restricted = false; return "--";
"-"                                return "-";
"*="                               return "*=";
"*"                                return "*";
"/="                               return "/=";
"/"                                return "/";
"%="                               return "%=";
"%"                                return "%";
"&&"                               return "&&";
"&="                               return "&=";
"&"                                return "&";
"||"                               return "||";
"|="                               return "|=";
"|"                                return "|";
"^="                               return "^=";
"^"                                return "^";
"~"                                parser.restricted = false; return "~";
<<EOF>>                            return "EOF";
.                                  return "ERROR";

%%

/* Begin Lexer Customization Methods */
var _originalLexMethod = lexer.lex;

lexer.lex = function() {
	parser.wasNewLine = parser.newLine;
	parser.newLine = false;

	return _originalLexMethod.call(this);
};
/* End Lexer Customization Methods */

/lex

%start Program /* Define Start Production */
%% /* Define Grammar Productions */

Statement
    : Block
    | VariableStatement
    | EmptyStatement
    | ExpressionStatement
    | IfStatement
    | IterationStatement
    | ContinueStatement
    | BreakStatement
    | ReturnStatement
    | WithStatement
    | LabelledStatement
    | SwitchStatement
    | ThrowStatement
    | TryStatement
    | DebuggerStatement
    ;

Block
    : "{" StatementList "}"
        {
            $$ = new BlockStatementNode($2, createSourceLocation(null, @1, @3));
        }
    ;

StatementList
    : StatementList Statement
        {
            $$ = $1.concat($2);
        }
    |
        {
            $$ = [];
        }
    ;

VariableStatement
    : "VAR" VariableDeclarationList
        {
            $$ = new VariableDeclarationNode($2, "var", createSourceLocation(null, @1, @2));
        }
    ;

VariableDeclarationList
    : VariableDeclaration
        {
            $$ = [$1];
        }
    | VariableDeclarationList "," VariableDeclaration
        {
            $$ = $1.concat($3);
        }
    ;

VariableDeclarationListNoIn
    : VariableDeclarationNoIn
        {
            $$ = [$1];
        }
    | VariableDeclarationListNoIn "," VariableDeclarationNoIn
        {
            $1.push.apply($1, $3);
            $$ = $1;
        }
    ;

VariableDeclaration
    : "IDENTIFIER"
        {
            $$ = new VariableDeclaratorNode(new IdentifierNode($1, createSourceLocation(null, @1, @1)), null, createSourceLocation(null, @1, @1));
        }
    | "IDENTIFIER" Initialiser
        {
            $$ = new VariableDeclaratorNode(new IdentifierNode($1, createSourceLocation(null, @1, @1)), $2, createSourceLocation(null, @1, @2));
        }
    ;

VariableDeclarationNoIn
    : "IDENTIFIER"
        {
            $$ = new VariableDeclaratorNode(new IdentifierNode($1, createSourceLocation(null, @1, @1)), null, createSourceLocation(null, @1, @1));
        }
    | "IDENTIFIER" InitialiserNoIn
        {
            $$ = new VariableDeclaratorNode(new IdentifierNode($1, createSourceLocation(null, @1, @1)), $2, createSourceLocation(null, @1, @2));
        }
    ;

Initialiser
    : "=" AssignmentExpression
        {
            $$ = $2;
        }
    ;

InitialiserNoIn
    : "=" AssignmentExpressionNoIn
        {
            $$ = $2;
        }
    ;

EmptyStatement
    : ";"
        {
            $$ = new EmptyStatementNode(createSourceLocation(null, @1, @1));
        }
    ;

ExpressionStatement
    : ExpressionNoBF ";"
        {
            $$ = new ExpressionStatementNode($1, createSourceLocation(null, @1, @2));
        }
    | ExpressionNoBF error
        {
            $$ = new ExpressionStatementNode($1, createSourceLocation(null, @1, @1));
        }
    ;

IfStatement
    : "IF" "(" Expression ")" Statement
        {
            $$ = new IfStatementNode($3, $5, null, createSourceLocation(null, @1, @5));
        }
    | "IF" "(" Expression ")" Statement "ELSE" Statement
        {
            $$ = new IfStatementNode($3, $5, $7, createSourceLocation(null, @1, @7));
        }
    ;

IterationStatement
    : "DO" Statement "WHILE" "(" Expression ")" ";"
        {
            $$ = new DoWhileStatementNode($2, $5, createSourceLocation(null, @1, @7));
        }
    | "DO" Statement "WHILE" "(" Expression ")" error
        {
            $$ = new DoWhileStatementNode($2, $5, createSourceLocation(null, @1, @6));
        }
    | "WHILE" "(" Expression ")" Statement
        {
            $$ = new WhileStatementNode($3, $5, createSourceLocation(null, @1, @5));
        }
    | "FOR" "(" ExpressionNoIn ";" Expression ";" Expression ")" Statement
        {
            $$ = new ForStatementNode($3, $5, $7, $9, createSourceLocation(null, @1, @9));
        }
    | "FOR" "(" ExpressionNoIn ";" Expression ";" ")" Statement
        {
            $$ = new ForStatementNode($3, $5, null, $8, createSourceLocation(null, @1, @8));
        }
    | "FOR" "(" ExpressionNoIn ";" ";" Expression ")" Statement
        {
            $$ = new ForStatementNode($3, null, $6, $8, createSourceLocation(null, @1, @8));
        }
    | "FOR" "(" ExpressionNoIn ";" ";" ")" Statement
        {
            $$ = new ForStatementNode($3, null, null, $7, createSourceLocation(null, @1, @7));
        }
    | "FOR" "(" ";" Expression ";" Expression ")" Statement
        {
            $$ = new ForStatementNode(null, $4, $6, $8, createSourceLocation(null, @1, @8));
        }
    | "FOR" "(" ";" Expression ";" ")" Statement
        {
            $$ = new ForStatementNode(null, $4, null, $7, createSourceLocation(null, @1, @7));
        }
    | "FOR" "(" ";" ";" Expression ")" Statement
        {
            $$ = new ForStatementNode(null, null, $5, $7, createSourceLocation(null, @1, @7));
        }
    | "FOR" "(" ";" ";" ")" Statement
        {
            $$ = new ForStatementNode(null, null, null, $6, createSourceLocation(null, @1, @6));
        }
    | "FOR" "(" "VAR" VariableDeclarationListNoIn ";" Expression ";" Expression ")" Statement
        {
            $$ = new ForStatementNode($4, $6, $8, $10, createSourceLocation(null, @1, @10));
        }
    | "FOR" "(" "VAR" VariableDeclarationListNoIn ";" Expression ";" ")" Statement
        {
            $$ = new ForStatementNode($4, $6, null, $9, createSourceLocation(null, @1, @9));
        }
    | "FOR" "(" "VAR" VariableDeclarationListNoIn ";" ";" Expression ")" Statement
        {
            $$ = new ForStatementNode($4, null, $7, $9, createSourceLocation(null, @1, @9));
        }
    | "FOR" "(" "VAR" VariableDeclarationListNoIn ";" ";" ")" Statement
        {
            $$ = new ForStatementNode($4, null, null, $8, createSourceLocation(null, @1, @8));
        }
    | "FOR" "(" LeftHandSideExpression "IN" Expression ")" Statement
        {
            $$ = new ForInStatementNode($3, $5, $7, createSourceLocation(null, @1, @7));
        }
    | "FOR" "(" "VAR" VariableDeclarationNoIn "IN" Expression ")" Statement
        {
            $$ = new ForInStatementNode($4, $6, $8, createSourceLocation(null, @1, @8));
        }
    ;

ContinueStatement
    : "CONTINUE" ";"
        {
            $$ = new ContinueStatementNode(null, createSourceLocation(null, @1, @2));
        }
    | "CONTINUE" error
        {
            $$ = new ContinueStatementNode(null, createSourceLocation(null, @1, @1));
        }
    | "CONTINUE" "IDENTIFIER" ";"
        {
            $$ = new ContinueStatementNode(new IdentifierNode($2, createSourceLocation(null, @2, @2)), createSourceLocation(null, @1, @3));
        }
    | "CONTINUE" "IDENTIFIER" error
        {
            $$ = new ContinueStatementNode(new IdentifierNode($2, createSourceLocation(null, @2, @2)), createSourceLocation(null, @1, @2));
        }
    ;

BreakStatement
    : "BREAK" ";"
        {
            $$ = new BreakStatementNode(null, createSourceLocation(null, @1, @2));
        }
    | "BREAK" error
        {
            $$ = new BreakStatementNode(null, createSourceLocation(null, @1, @1));
        }
    | "BREAK" "IDENTIFIER" ";"
        {
            $$ = new BreakStatementNode(new IdentifierNode($2, createSourceLocation(null, @2, @2)), createSourceLocation(null, @1, @3));
        }
    | "BREAK" "IDENTIFIER" error
        {
            $$ = new BreakStatementNode(new IdentifierNode($2, createSourceLocation(null, @2, @2)), createSourceLocation(null, @1, @2));
        }
    ;

ReturnStatement
    : "RETURN" ";"
        {
            $$ = new ReturnStatementNode(null, createSourceLocation(null, @1, @2));
        }
    | "RETURN" error
        {
            $$ = new ReturnStatementNode(null, createSourceLocation(null, @1, @1));
        }
    | "RETURN" Expression ";"
        {
            $$ = new ReturnStatementNode($2, createSourceLocation(null, @1, @3));
        }
    | "RETURN" Expression error
        {
            $$ = new ReturnStatementNode($2, createSourceLocation(null, @1, @2));
        }
    ;

WithStatement
    : "WITH" "(" Expression ")" Statement
        {
            $$ = new WithStatementNode($3, $5, createSourceLocation(null, @1, @5));
        }
    ;

SwitchStatement
    : "SWITCH" "(" Expression ")" CaseBlock
        {
            $$ = new SwitchStatementNode($3, $5, createSourceLocation(null, @1, @5));
        }
    ;

CaseBlock
    : "{" CaseClauses "}"
        {
            $$ = $2;
        }
    | "{" CaseClauses DefaultClause CaseClauses "}"
        {
            $$ = $2.concat($3).concat($4);
        }
    ;

CaseClauses
    : CaseClauses CaseClause
        {
            $$ = $1.concat($2);
        }
    |
        {
            $$ = [];
        }
    ;

CaseClause
    : "CASE" Expression ":" StatementList
        {
            $$ = new SwitchCaseNode($2, $4, createSourceLocation(null, @1, @4));
        }
    ;

DefaultClause
    : "DEFAULT" ":" StatementList
        {
            $$ = new SwitchCaseNode(null, $3, createSourceLocation(null, @1, @3));
        }
    ;

LabelledStatement
    : "IDENTIFIER" ":" Statement
        {
            $$ = new LabeledStatementNode(new IdentifierNode($1, createSourceLocation(null, @1, @1)), $3, createSourceLocation(null, @1, @3));
        }
    ;

ThrowStatement
    : "THROW" Expression ";"
        {
            $$ = new ThrowStatementNode($2, createSourceLocation(null, @1, @3));
        }
    | "THROW" Expression error
        {
            $$ = new ThrowStatementNode($2, createSourceLocation(null, @1, @2));
        }
    ;

TryStatement
    : "TRY" Block Catch
        {
            $$ = new TryStatementNode($2, $3, null, createSourceLocation(null, @1, @3));
        }
    | "TRY" Block Finally
        {
            $$ = new TryStatementNode($2, null, $3, createSourceLocation(null, @1, @3));
        }
    | "TRY" Block Catch Finally
        {
            $$ = new TryStatementNode($2, $3, $4, createSourceLocation(null, @1, @4));
        }
    ;

Catch
    : "CATCH" "(" "IDENTIFIER" ")" Block
        {
            $$ = new CatchClauseNode(new IdentifierNode($3, createSourceLocation(null, @3, @3)), $5, createSourceLocation(null, @1, @5));
        }
    ;

Finally
    : "FINALLY" Block
        {
            $$ = $2;
        }
    ;

DebuggerStatement
    : "DEBUGGER" ";"
        {
            $$ = new DebugggerStatementNode(createSourceLocation(null, @1, @2));
        }
    | "DEBUGGER" error
        {
            $$ = new DebugggerStatementNode(createSourceLocation(null, @1, @1));
        }
    ;

FunctionDeclaration
    : "FUNCTION" "IDENTIFIER" "(" ")" "{" FunctionBody "}"
        {
	    $$ = new FunctionDeclarationNode(new IdentifierNode($2, createSourceLocation(null, @2, @2)), [], $6, false, false, createSourceLocation(null, @1, @7));
        }
    | "FUNCTION" "IDENTIFIER" "(" FormalParameterList ")" "{" FunctionBody "}"
        {
	    $$ = new FunctionDeclarationNode(new IdentifierNode($2, createSourceLocation(null, @2, @2)), $4, $7, false, false, createSourceLocation(null, @1, @8));
        }
    ;

FunctionExpression
    : "FUNCTION" "IDENTIFIER" "(" ")" "{" FunctionBody "}"
        {
	    $$ = new FunctionExpressionNode(new IdentifierNode($2, createSourceLocation(null, @2, @2)), [], $6, false, false, createSourceLocation(null, @1, @7));
        }
    | "FUNCTION" "IDENTIFIER" "(" FormalParameterList ")" "{" FunctionBody "}"
        {
	    $$ = new FunctionExpressionNode(new IdentifierNode($2, createSourceLocation(null, @2, @2)), $4, $7, false, false, createSourceLocation(null, @1, @8));
        }
    | "FUNCTION" "(" ")" "{" FunctionBody "}"
        {
	    $$ = new FunctionExpressionNode(null, [], $5, false, false, createSourceLocation(null, @1, @6));
        }
    | "FUNCTION" "(" FormalParameterList ")" "{" FunctionBody "}"
        {
	    $$ = new FunctionExpressionNode(null, $3, $6, false, false, createSourceLocation(null, @1, @7));
        }
    ;

FormalParameterList
    : "IDENTIFIER"
        {
            $$ = [new IdentifierNode($1, createSourceLocation(null, @1, @1))];
        }
    | FormalParameterList "," "IDENTIFIER"
        {
            $$ = $1.concat(new IdentifierNode($3, createSourceLocation(null, @3, @3)));
        }
    ;

FunctionBody
    : SourceElements
    ;

Program
    : SourceElements EOF
        {
            $$ = new ProgramNode($1, createSourceLocation(null, @1, @2));
            return $$;
        }
    ;

SourceElements
    : SourceElements SourceElement
        {
            $$ = $1.concat($2);
        }
    |
        {
            $$ = [];
        }
    ;

SourceElement
    : Statement
    | FunctionDeclaration
    ;

PrimaryExpression
    : PrimaryExpressionNoBrace
    | ObjectLiteral
    ;

PrimaryExpressionNoBrace
    : "THIS"
        {
            $$ = new ThisExpressionNode(createSourceLocation(null, @1, @1));
        }
    | "IDENTIFIER"
        {
            $$ = new IdentifierNode($1, createSourceLocation(null, @1, @1));
        }
    | Literal
    | ArrayLiteral
    | "(" Expression ")"
        {
            $$ = $2;
        }
    ;

ArrayLiteral
    : "[" "]"
        {
            $$ = new ArrayExpressionNode([], createSourceLocation(null, @1, @2));
        }
    | "[" Elision "]"
        {
            $$ = new ArrayExpressionNode($2, createSourceLocation(null, @1, @3));
        }
    | "[" ElementList "]"
        {
            $$ = new ArrayExpressionNode($2, createSourceLocation(null, @1, @3));
        }
    | "[" ElementList "," "]"
        {
            $$ = new ArrayExpressionNode($2.concat(null), createSourceLocation(null, @1, @4));
        }
    | "[" ElementList "," Elision "]"
        {
            $$ = new ArrayExpressionNode($2.concat($4), createSourceLocation(null, @1, @5));
        }
    ;

ElementList
    : AssignmentExpression
        {
            $$ = [$1];
        }
    | Elision AssignmentExpression
        {
            $$ = $1.concat($2);
        }
    | ElementList "," AssignmentExpression
        {
            $$ = $1.concat($3);
        }
    | ElementList "," Elision AssignmentExpression
        {
            $$ = $1.concat($3).concat($4);
        }
    ;

Elision
    : ","
        {
            $$ = [null, null];
        }
    | Elision ","
        {
            $$ = $1.concat(null);
        }
    ;

ObjectLiteral
    : "{" "}"
        {
            $$ = new ObjectExpressionNode([], createSourceLocation(null, @1, @2));
        }
    | "{" PropertyNameAndValueList "}"
        {
            $$ = new ObjectExpressionNode($2, createSourceLocation(null, @1, @3));
        }
    | "{" PropertyNameAndValueList "," "}"
        {
            $$ = new ObjectExpressionNode($2, createSourceLocation(null, @1, @4));
        }
    ;

PropertyNameAndValueList
    : PropertyAssignment
        {
            $$ = [$1];
        }
    | PropertyNameAndValueList "," PropertyAssignment
        {
            $$ = $1.concat($3);
        }
    ;

PropertyAssignment
    : PropertyName ":" AssignmentExpression
        {
            $$ = {key: $1, value: $3, kind: "init"};
        }
    | "IDENTIFIER" PropertyName "(" ")" "{" FunctionBody "}"
        {
            if ($1 === "get") {
                $$ = {key: $2, value: (new FunctionExpressionNode(null, [], $6, false, false, createSourceLocation(null, @2, @7))), kind: "get"};
            } else {
                this.parseError("Invalid getter", {});
            }
        }
    | "IDENTIFIER" PropertyName "(" PropertySetParameterList ")" "{" FunctionBody "}"
        {
            if ($1 === "set") {
                $$ = {key: $2, value: (new FunctionExpressionNode(null, $4, $7, false, false, createSourceLocation(null, @2, @8))), kind: "set"};
            } else {
                this.parseError("Invalid setter", {});
            }
        }
    ;

PropertyName
    : IdentifierName
    | StringLiteral
    | NumericLiteral
    ;

PropertySetParameterList
    : "IDENTIFIER"
        {
            $$ = [new IdentifierNode($1, createSourceLocation(null, @1, @1))];
        }
    ;

MemberExpression
    : PrimaryExpression
    | FunctionExpression
    | MemberExpression "[" Expression "]"
        {
            $$ = new MemberExpressionNode($1, $3, true, createSourceLocation(null, @1, @4));
        }
    | MemberExpression "." IdentifierName
        {
            $$ = new MemberExpressionNode($1, $3, false, createSourceLocation(null, @1, @3));
        }
    | "NEW" MemberExpression Arguments
        {
            $$ = new NewExpressionNode($2, $3, createSourceLocation(null, @1, @3));
        }
    ;

MemberExpressionNoBF
    : PrimaryExpressionNoBrace
    | MemberExpressionNoBF "[" Expression "]"
        {
            $$ = new MemberExpressionNode($1, $3, true, createSourceLocation(null, @1, @4));
        }
    | MemberExpressionNoBF "." IdentifierName
        {
            $$ = new MemberExpressionNode($1, $3, false, createSourceLocation(null, @1, @3));
        }
    | "NEW" MemberExpression Arguments
        {
            $$ = new NewExpressionNode($2, $3, createSourceLocation(null, @1, @3));
        }
    ;

NewExpression
    : MemberExpression
    | "NEW" NewExpression
        {
            $$ = new NewExpressionNode($2, null, createSourceLocation(null, @1, @2));
        }
    ;

NewExpressionNoBF
    : MemberExpressionNoBF
    | "NEW" NewExpression
        {
            $$ = new NewExpressionNode($2, null, createSourceLocation(null, @1, @2));
        }
    ;

CallExpression
    : MemberExpression Arguments
        {
            $$ = new CallExpressionNode($1, $2, createSourceLocation(null, @1, @2));
        }
    | CallExpression Arguments
        {
            $$ = new CallExpressionNode($1, $2, createSourceLocation(null, @1, @2));
        }
    | CallExpression "[" Expression "]"
        {
            $$ = new MemberExpressionNode($1, $3, true, createSourceLocation(null, @1, @4));
        }
    | CallExpression "." IdentifierName
        {
            $$ = new MemberExpressionNode($1, $3, false, createSourceLocation(null, @1, @3));
        }
    ;

CallExpressionNoBF
    : MemberExpressionNoBF Arguments
        {
            $$ = new CallExpressionNode($1, $2, createSourceLocation(null, @1, @2));
        }
    | CallExpressionNoBF Arguments
        {
            $$ = new CallExpressionNode($1, $2, createSourceLocation(null, @1, @2));
        }
    | CallExpressionNoBF "[" Expression "]"
        {
            $$ = new MemberExpressionNode($1, $3, true, createSourceLocation(null, @1, @4));
        }
    | CallExpressionNoBF "." IdentifierName
        {
            $$ = new MemberExpressionNode($1, $3, false, createSourceLocation(null, @1, @3));
        }
    ;

IdentifierName
    : "IDENTIFIER"
        {
            $$ = new IdentifierNode($1, createSourceLocation(null, @1, @1));
        }
    | ReservedWord
        {
            $$ = new IdentifierNode($1, createSourceLocation(null, @1, @1));
        }
    ;

Arguments
    : "(" ")"
        {
            $$ = [];
        }
    | "(" ArgumentList ")"
        {
            $$ = $2;
        }
    ;

ArgumentList
    : AssignmentExpression
        {
            $$ = [$1];
        }
    | ArgumentList "," AssignmentExpression
        {
            $$ = $1.concat($3);
        }
    ;

LeftHandSideExpression
    : NewExpression
    | CallExpression
    ;

LeftHandSideExpressionNoBF
    : NewExpressionNoBF
    | CallExpressionNoBF
    ;

PostfixExpression
    : LeftHandSideExpression
    | LeftHandSideExpression "++"
        {
            $$ = new UpdateExpressionNode("++", $1, false, createSourceLocation(null, @1, @2));
        }
    | LeftHandSideExpression "--"
        {
            $$ = new UpdateExpressionNode("--", $1, false, createSourceLocation(null, @1, @2));
        }
    ;

PostfixExpressionNoBF
    : LeftHandSideExpressionNoBF
    | LeftHandSideExpressionNoBF "++"
        {
            $$ = new UpdateExpressionNode("++", $1, false, createSourceLocation(null, @1, @2));
        }
    | LeftHandSideExpressionNoBF "--"
        {
            $$ = new UpdateExpressionNode("--", $1, false, createSourceLocation(null, @1, @2));
        }
    ;

UnaryExpression
    : PostfixExpression
    | UnaryExpr
    ;

UnaryExpressionNoBF
    : PostfixExpressionNoBF
    | UnaryExpr
    ;

UnaryExpr
    : "DELETE" UnaryExpression
        {
            $$ = new UnaryExpressionNode("delete", true, $2, createSourceLocation(null, @1, @2));
        }
    | "VOID" UnaryExpression
        {
            $$ = new UnaryExpressionNode("void", true, $2, createSourceLocation(null, @1, @2));
        }
    | "TYPEOF" UnaryExpression
        {
            $$ = new UnaryExpressionNode("typeof", true, $2, createSourceLocation(null, @1, @2));
        }
    | "BR++" UnaryExpression
        {
            @1.first_line = @1.last_line;
            @1.first_column = @1.last_column - 2;
            $$ = new UpdateExpressionNode("++", $2, true, createSourceLocation(null, @1, @2));
        }
    | "BR--" UnaryExpression
        {
            @1.first_line = @1.last_line;
            @1.first_column = @1.last_column - 2;
            $$ = new UpdateExpressionNode("--", $2, true, createSourceLocation(null, @1, @2));
        }
    | "++" UnaryExpression
        {
            $$ = new UpdateExpressionNode("++", $2, true, createSourceLocation(null, @1, @2));
        }
    | "--" UnaryExpression
        {
            $$ = new UpdateExpressionNode("--", $2, true, createSourceLocation(null, @1, @2));
        }
    | "+" UnaryExpression
        {
            $$ = new UnaryExpressionNode("+", true, $2, createSourceLocation(null, @1, @2));
        }
    | "-" UnaryExpression
        {
            $$ = new UnaryExpressionNode("-", true, $2, createSourceLocation(null, @1, @2));
        }
    | "~" UnaryExpression
        {
            $$ = new UnaryExpressionNode("~", true, $2, createSourceLocation(null, @1, @2));
        }
    | "!" UnaryExpression
        {
            $$ = new UnaryExpressionNode("!", true, $2, createSourceLocation(null, @1, @2));
        }
    ;

MultiplicativeExpression
    : UnaryExpression
    | MultiplicativeExpression "*" UnaryExpression
        {
            $$ = new BinaryExpressionNode("*", $1, $3, createSourceLocation(null, @1, @3));
        }
    | MultiplicativeExpression "/" UnaryExpression
        {
            $$ = new BinaryExpressionNode("/", $1, $3, createSourceLocation(null, @1, @3));
        }
    | MultiplicativeExpression "%" UnaryExpression
        {
            $$ = new BinaryExpressionNode("%", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

MultiplicativeExpressionNoBF
    : UnaryExpressionNoBF
    | MultiplicativeExpressionNoBF "*" UnaryExpression
        {
            $$ = new BinaryExpressionNode("*", $1, $3, createSourceLocation(null, @1, @3));
        }
    | MultiplicativeExpressionNoBF "/" UnaryExpression
        {
            $$ = new BinaryExpressionNode("/", $1, $3, createSourceLocation(null, @1, @3));
        }
    | MultiplicativeExpressionNoBF "%" UnaryExpression
        {
            $$ = new BinaryExpressionNode("%", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

AdditiveExpression
    : MultiplicativeExpression
    | AdditiveExpression "+" MultiplicativeExpression
        {
            $$ = new BinaryExpressionNode("+", $1, $3, createSourceLocation(null, @1, @3));
        }
    | AdditiveExpression "-" MultiplicativeExpression
        {
            $$ = new BinaryExpressionNode("-", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

AdditiveExpressionNoBF
    : MultiplicativeExpressionNoBF
    | AdditiveExpressionNoBF "+" MultiplicativeExpression
        {
            $$ = new BinaryExpressionNode("+", $1, $3, createSourceLocation(null, @1, @3));
        }
    | AdditiveExpressionNoBF "-" MultiplicativeExpression
        {
            $$ = new BinaryExpressionNode("-", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

ShiftExpression
    : AdditiveExpression
    | ShiftExpression "<<" AdditiveExpression
        {
            $$ = new BinaryExpressionNode("<<", $1, $3, createSourceLocation(null, @1, @3));
        }
    | ShiftExpression ">>" AdditiveExpression
        {
            $$ = new BinaryExpressionNode(">>", $1, $3, createSourceLocation(null, @1, @3));
        }
    | ShiftExpression ">>>" AdditiveExpression
        {
            $$ = new BinaryExpressionNode(">>>", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

ShiftExpressionNoBF
    : AdditiveExpressionNoBF
    | ShiftExpressionNoBF "<<" AdditiveExpression
        {
            $$ = new BinaryExpressionNode("<<", $1, $3, createSourceLocation(null, @1, @3));
        }
    | ShiftExpressionNoBF ">>" AdditiveExpression
        {
            $$ = new BinaryExpressionNode(">>", $1, $3, createSourceLocation(null, @1, @3));
        }
    | ShiftExpressionNoBF ">>>" AdditiveExpression
        {
            $$ = new BinaryExpressionNode(">>>", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

RelationalExpression
    : ShiftExpression
    | RelationalExpression "<" ShiftExpression
        {
            $$ = new BinaryExpressionNode("<", $1, $3, createSourceLocation(null, @1, @3));
        }
    | RelationalExpression ">" ShiftExpression
        {
            $$ = new BinaryExpressionNode(">", $1, $3, createSourceLocation(null, @1, @3));
        }
    | RelationalExpression "<=" ShiftExpression
        {
            $$ = new BinaryExpressionNode("<=", $1, $3, createSourceLocation(null, @1, @3));
        }
    | RelationalExpression ">=" ShiftExpression
        {
            $$ = new BinaryExpressionNode(">=", $1, $3, createSourceLocation(null, @1, @3));
        }
    | RelationalExpression "INSTANCEOF" ShiftExpression
        {
            $$ = new BinaryExpressionNode("instanceof", $1, $3, createSourceLocation(null, @1, @3));
        }
    | RelationalExpression "IN" ShiftExpression
        {
            $$ = new BinaryExpressionNode("in", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

RelationalExpressionNoIn
    : ShiftExpression
    | RelationalExpressionNoIn "<" ShiftExpression
        {
            $$ = new BinaryExpressionNode("<", $1, $3, createSourceLocation(null, @1, @3));
        }
    | RelationalExpressionNoIn ">" ShiftExpression
        {
            $$ = new BinaryExpressionNode(">", $1, $3, createSourceLocation(null, @1, @3));
        }
    | RelationalExpressionNoIn "<=" ShiftExpression
        {
            $$ = new BinaryExpressionNode("<=", $1, $3, createSourceLocation(null, @1, @3));
        }
    | RelationalExpressionNoIn ">=" ShiftExpression
        {
            $$ = new BinaryExpressionNode(">=", $1, $3, createSourceLocation(null, @1, @3));
        }
    | RelationalExpressionNoIn "INSTANCEOF" ShiftExpression
        {
            $$ = new BinaryExpressionNode("instanceof", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

RelationalExpressionNoBF
    : ShiftExpressionNoBF
    | RelationalExpressionNoBF "<" ShiftExpression
        {
            $$ = new BinaryExpressionNode("<", $1, $3, createSourceLocation(null, @1, @3));
        }
    | RelationalExpressionNoBF ">" ShiftExpression
        {
            $$ = new BinaryExpressionNode(">", $1, $3, createSourceLocation(null, @1, @3));
        }
    | RelationalExpressionNoBF "<=" ShiftExpression
        {
            $$ = new BinaryExpressionNode("<=", $1, $3, createSourceLocation(null, @1, @3));
        }
    | RelationalExpressionNoBF ">=" ShiftExpression
        {
            $$ = new BinaryExpressionNode(">=", $1, $3, createSourceLocation(null, @1, @3));
        }
    | RelationalExpressionNoBF "INSTANCEOF" ShiftExpression
        {
            $$ = new BinaryExpressionNode("instanceof", $1, $3, createSourceLocation(null, @1, @3));
        }
    | RelationalExpressionNoBF "IN" ShiftExpression
        {
            $$ = new BinaryExpressionNode("in", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

EqualityExpression
    : RelationalExpression
    | EqualityExpression "==" RelationalExpression
        {
            $$ = new BinaryExpressionNode("==", $1, $3, createSourceLocation(null, @1, @3));
        }
    | EqualityExpression "!=" RelationalExpression
        {
            $$ = new BinaryExpressionNode("!=", $1, $3, createSourceLocation(null, @1, @3));
        }
    | EqualityExpression "===" RelationalExpression
        {
            $$ = new BinaryExpressionNode("===", $1, $3, createSourceLocation(null, @1, @3));
        }
    | EqualityExpression "!==" RelationalExpression
        {
            $$ = new BinaryExpressionNode("!==", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

EqualityExpressionNoIn
    : RelationalExpressionNoIn
    | EqualityExpressionNoIn "==" RelationalExpressionNoIn
        {
            $$ = new BinaryExpressionNode("==", $1, $3, createSourceLocation(null, @1, @3));
        }
    | EqualityExpressionNoIn "!=" RelationalExpressionNoIn
        {
            $$ = new BinaryExpressionNode("!=", $1, $3, createSourceLocation(null, @1, @3));
        }
    | EqualityExpressionNoIn "===" RelationalExpressionNoIn
        {
            $$ = new BinaryExpressionNode("===", $1, $3, createSourceLocation(null, @1, @3));
        }
    | EqualityExpressionNoIn "!==" RelationalExpressionNoIn
        {
            $$ = new BinaryExpressionNode("!==", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

EqualityExpressionNoBF
    : RelationalExpressionNoBF
    | EqualityExpressionNoBF "==" RelationalExpression
        {
            $$ = new BinaryExpressionNode("==", $1, $3, createSourceLocation(null, @1, @3));
        }
    | EqualityExpressionNoBF "!=" RelationalExpression
        {
            $$ = new BinaryExpressionNode("!=", $1, $3, createSourceLocation(null, @1, @3));
        }
    | EqualityExpressionNoBF "===" RelationalExpression
        {
            $$ = new BinaryExpressionNode("===", $1, $3, createSourceLocation(null, @1, @3));
        }
    | EqualityExpressionNoBF "!==" RelationalExpression
        {
            $$ = new BinaryExpressionNode("!==", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

BitwiseANDExpression
    : EqualityExpression
    | BitwiseANDExpression "&" EqualityExpression
        {
            $$ = new BinaryExpressionNode("&", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

BitwiseANDExpressionNoIn
    : EqualityExpressionNoIn
    | BitwiseANDExpressionNoIn "&" EqualityExpressionNoIn
        {
            $$ = new BinaryExpressionNode("&", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

BitwiseANDExpressionNoBF
    : EqualityExpressionNoBF
    | BitwiseANDExpressionNoBF "&" EqualityExpression
        {
            $$ = new BinaryExpressionNode("&", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

BitwiseXORExpression
    : BitwiseANDExpression
    | BitwiseXORExpression "^" BitwiseANDExpression
        {
            $$ = new BinaryExpressionNode("^", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

BitwiseXORExpressionNoIn
    : BitwiseANDExpressionNoIn
    | BitwiseXORExpressionNoIn "^" BitwiseANDExpressionNoIn
        {
            $$ = new BinaryExpressionNode("^", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

BitwiseXORExpressionNoBF
    : BitwiseANDExpressionNoBF
    | BitwiseXORExpressionNoBF "^" BitwiseANDExpression
        {
            $$ = new BinaryExpressionNode("^", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

BitwiseORExpression
    : BitwiseXORExpression
    | BitwiseORExpression "|" BitwiseXORExpression
        {
            $$ = new BinaryExpressionNode("|", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

BitwiseORExpressionNoIn
    : BitwiseXORExpressionNoIn
    | BitwiseORExpressionNoIn "|" BitwiseXORExpressionNoIn
        {
            $$ = new BinaryExpressionNode("|", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

BitwiseORExpressionNoBF
    : BitwiseXORExpressionNoBF
    | BitwiseORExpressionNoBF "|" BitwiseXORExpression
        {
            $$ = new BinaryExpressionNode("|", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

LogicalANDExpression
    : BitwiseORExpression
    | LogicalANDExpression "&&" BitwiseORExpression
        {
            $$ = new LogicalExpressionNode("&&", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

LogicalANDExpressionNoIn
    : BitwiseORExpressionNoIn
    | LogicalANDExpressionNoIn "&&" BitwiseORExpressionNoIn
        {
            $$ = new LogicalExpressionNode("&&", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

LogicalANDExpressionNoBF
    : BitwiseORExpressionNoBF
    | LogicalANDExpressionNoBF "&&" BitwiseORExpression
        {
            $$ = new LogicalExpressionNode("&&", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

LogicalORExpression
    : LogicalANDExpression
    | LogicalORExpression "||" LogicalANDExpression
        {
            $$ = new LogicalExpressionNode("||", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

LogicalORExpressionNoIn
    : LogicalANDExpressionNoIn
    | LogicalORExpressionNoIn "||" LogicalANDExpressionNoIn
        {
            $$ = new LogicalExpressionNode("||", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

LogicalORExpressionNoBF
    : LogicalANDExpressionNoBF
    | LogicalORExpressionNoBF "||" LogicalANDExpression
        {
            $$ = new LogicalExpressionNode("||", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

ConditionalExpression
    : LogicalORExpression
    | LogicalORExpression "?" AssignmentExpression ":" AssignmentExpression
        {
            $$ = new ConditionalExpressionNode($1, $3, $5, createSourceLocation(null, @1, @5));
        }
    ;

ConditionalExpressionNoIn
    : LogicalORExpressionNoIn
    | LogicalORExpressionNoIn "?" AssignmentExpression ":" AssignmentExpressionNoIn
        {
            $$ = new ConditionalExpressionNode($1, $3, $5, createSourceLocation(null, @1, @5));
        }
    ;

ConditionalExpressionNoBF
    : LogicalORExpressionNoBF
    | LogicalORExpressionNoBF "?" AssignmentExpression ":" AssignmentExpression
        {
            $$ = new ConditionalExpressionNode($1, $3, $5, createSourceLocation(null, @1, @5));
        }
    ;

AssignmentExpression
    : ConditionalExpression
    | LeftHandSideExpression "=" AssignmentExpression
        {
            $$ = new AssignmentExpressionNode("=", $1, $3, createSourceLocation(null, @1, @3));
        }
    | LeftHandSideExpression AssignmentOperator AssignmentExpression
        {
            $$ = new AssignmentExpressionNode($2, $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

AssignmentExpressionNoIn
    : ConditionalExpressionNoIn
    | LeftHandSideExpression "=" AssignmentExpressionNoIn
        {
            $$ = new AssignmentExpressionNode("=", $1, $3, createSourceLocation(null, @1, @3));
        }
    | LeftHandSideExpression AssignmentOperator AssignmentExpressionNoIn
        {
            $$ = new AssignmentExpressionNode($2, $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

AssignmentExpressionNoBF
    : ConditionalExpressionNoBF
    | LeftHandSideExpressionNoBF "=" AssignmentExpression
        {
            $$ = new AssignmentExpressionNode("=", $1, $3, createSourceLocation(null, @1, @3));
        }
    | LeftHandSideExpressionNoBF AssignmentOperator AssignmentExpression
        {
            $$ = new AssignmentExpressionNode($2, $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

AssignmentOperator
    : "*="
    | "/="
    | "%="
    | "+="
    | "-="
    | "<<="
    | ">>="
    | ">>>="
    | "&="
    | "^="
    | "|="
    ;

Expression
    : AssignmentExpression
    | Expression "," AssignmentExpression
        {
            if ($1.type === "SequenceExpression") {
                $1.expressions.concat($3);
                $1.loc = createSourceLocation(null, @1, @3);
                $$ = $1;
            } else {
                $$ = new SequenceExpressionNode([$1, $3], createSourceLocation(null, @1, @3));
            }
        }
    ;

ExpressionNoIn
    : AssignmentExpressionNoIn
    | ExpressionNoIn "," AssignmentExpressionNoIn
        {
            if ($1.type === "SequenceExpression") {
                $1.expressions.concat($3);
                $1.loc = createSourceLocation(null, @1, @3);
                $$ = $1;
            } else {
                $$ = new SequenceExpressionNode([$1, $3], createSourceLocation(null, @1, @3));
            }
        }
    ;

ExpressionNoBF
    : AssignmentExpressionNoBF
    | ExpressionNoBF "," AssignmentExpression
        {
            if ($1.type === "SequenceExpression") {
                $1.expressions.concat($3);
                $1.loc = createSourceLocation(null, @1, @3);
                $$ = $1;
            } else {
                $$ = new SequenceExpressionNode([$1, $3], createSourceLocation(null, @1, @3));
            }
        }
    ;

Literal
    : NullLiteral
    | BooleanLiteral
    | NumericLiteral
    | StringLiteral
    | RegularExpressionLiteral
    ;

NullLiteral
    : "NULL"
        {
            $$ = new LiteralNode(null, createSourceLocation(null, @1, @1));
        }
    ;

BooleanLiteral
    : "TRUE"
        {
            $$ = new LiteralNode(true, createSourceLocation(null, @1, @1));
        }
    | "FALSE"
        {
            $$ = new LiteralNode(false, createSourceLocation(null, @1, @1));
        }
    ;

NumericLiteral
    : "NUMERIC_LITERAL"
        {
            $$ = new LiteralNode(parseNumericLiteral($1), createSourceLocation(null, @1, @1));
        }
    ;

StringLiteral
    : "STRING_LITERAL"
        {
            $$ = new LiteralNode($1, createSourceLocation(null, @1, @1));
        }
    ;

RegularExpressionLiteral
    : RegularExpressionLiteralBegin "REGEXP_LITERAL"
        {
            $$ = new LiteralNode(parseRegularExpressionLiteral($1 + $2), createSourceLocation(null, @1, @2));
        }
    ;

RegularExpressionLiteralBegin
    : "/"
        {
            yy.lexer.begin("REGEXP");
        }
    | "/="
        {
            yy.lexer.begin("REGEXP");
        }
    ;

ReservedWord
    : "BREAK"
    | "CASE"
    | "CATCH"
    | "CONTINUE"
    | "DEBUGGER"
    | "DEFAULT"
    | "DELETE"
    | "DO"
    | "ELSE"
    | "FINALLY"
    | "FOR"
    | "FUNCTION"
    | "IF"
    | "IN"
    | "INSTANCEOF"
    | "NEW"
    | "RETURN"
    | "SWITCH"
    | "THIS"
    | "THROW"
    | "TRY"
    | "TYPEOF"
    | "VAR"
    | "VOID"
    | "WHILE"
    | "WITH"
    | "TRUE"
    | "FALSE"
    | "NULL"
    | "CLASS"
    | "CONST"
    | "ENUM"
    | "EXPORT"
    | "EXTENDS"
    | "IMPORT"
    | "SUPER"
    ;

%%

function createSourceLocation(source, firstToken, lastToken) {
	return new SourceLocation(source, new Position(firstToken.first_line, firstToken.first_column), new Position(lastToken.last_line, lastToken.last_column));
}

function parseRegularExpressionLiteral(literal) {
	var last = literal.lastIndexOf("/");
	var body = literal.substring(1, last);
	var flags = literal.substring(last + 1);

	return new RegExp(body, flags);
}

function parseNumericLiteral(literal) {
	if (literal.charAt(0) === "0") {
		if (literal.charAt(1).toLowerCase() === "x") {
			return parseInt(literal, 16);
		} else {
			return parseInt(literal, 8);
		}
	} else {
		return Number("literal");
	}
}

/* Begin Parser Customization Methods */
var _originalParseMethod = parser.parse;

parser.parse = function(source, args) {
	parser.wasNewLine = false;
	parser.newLine = false;
	parser.restricted = false;

	return _originalParseMethod.call(this, source);
};

parser.parseError = function(str, hash) {
//		alert(JSON.stringify(hash) + "\n\n\n" + parser.newLine + "\n" + parser.wasNewLine + "\n\n" + hash.expected.indexOf("';'"));
	if (!((hash.expected && hash.expected.indexOf("';'") >= 0) && (hash.token === "}" || hash.token === "EOF" || hash.token === "BR++" || hash.token === "BR--" || parser.newLine || parser.wasNewLine))) {
		throw new SyntaxError(str);
	}
};
/* End Parser Customization Methods */

/* Begin AST Node Constructors */
function ProgramNode(body, loc) {
	this.type = "Program";
	this.body = body;
	this.loc = loc;
}

function EmptyStatementNode(loc) {
	this.type = "EmptyStatement";
	this.loc = loc;
}

function BlockStatementNode(body, loc) {
	this.type = "BlockStatement";
	this.body = body;
	this.loc = loc;
}

function ExpressionStatementNode(expression, loc) {
	this.type = "ExpressionStatement";
	this.expression = expression;
	this.loc = loc;
}

function IfStatementNode(test, consequent, alternate, loc) {
	this.type = "IfStatement";
	this.test = test;
	this.consequent = consequent;
	this.alternate = alternate;
	this.loc = loc;
}

function LabeledStatementNode(label, body, loc) {
	this.type = "LabeledStatement";
	this.label = label;
	this.body = body;
	this.loc = loc;
}

function BreakStatementNode(label, loc) {
	this.type = "BreakStatement";
	this.label = label;
	this.loc = loc;
}

function ContinueStatementNode(label, loc) {
	this.type = "ContinueStatement";
	this.label = label;
	this.loc = loc;
}

function WithStatementNode(object, body, loc) {
	this.type = "WithStatement";
	this.object = object;
	this.body = body;
	this.loc = loc;
}

function SwitchStatementNode(discriminant, cases, loc) {
	this.type = "SwitchStatement";
	this.discriminant = discriminant;
	this.cases = cases;
	this.loc = loc;
}

function ReturnStatementNode(argument, loc) {
	this.type = "ReturnStatement";
	this.argument = argument;
	this.loc = loc;
}

function ThrowStatementNode(argument, loc) {
	this.type = "ThrowStatement";
	this.argument = argument;
	this.loc = loc;
}

function TryStatementNode(block, handlers, finalizer, loc) {
	this.type = "TryStatement";
	this.block = block;
	this.handlers = handlers; // Multiple catch clauses are SpiderMonkey specific
	this.finalizer = finalizer;
	this.loc = loc;
}

function WhileStatementNode(test, body, loc) {
	this.type = "WhileStatement";
	this.test = test;
	this.body = body;
	this.loc = loc;
}

function DoWhileStatementNode(body, test, loc) {
	this.type = "DoWhileStatement";
	this.body = body;
	this.test = test;
	this.loc = loc;
}

function ForStatementNode(init, test, update, body, loc) {
	this.type = "ForStatement";
	this.init = init;
	this.test = test;
	this.update = update;
	this.body = body;
	this.loc = loc;
}

function ForInStatementNode(left, right, body, loc) {
	this.type = "ForInStatement";
	this.left = left;
	this.right = right;
	this.body = body;
	this.loc = loc;
}

function DebugggerStatementNode(loc) {
	this.type = "DebuggerStatement";
	this.loc = loc;
}

function FunctionDeclarationNode(id, params, body, generator, expression, loc) {
	this.type = "FunctionDeclaration";
	this.id = id;
	this.params = params;
	this.body = body;
	this.generator = generator;
	this.expression = expression;
	this.loc = loc;
}

function VariableDeclarationNode(declarations, kind, loc) {
	this.type = "VariableDeclaration";
	this.declarations = declarations;
	this.kind = kind;
	this.loc = loc;
}

function VariableDeclaratorNode(id, init, loc) {
	this.type = "VariableDeclarator";
	this.id = id;
	this.init = init;
	this.loc = loc;
}

function ThisExpressionNode(loc) {
	this.type = "ThisExpression";
	this.loc = loc;
}

function ArrayExpressionNode(elements, loc) {
	this.type = "ArrayExpression";
	this.elements = elements;
	this.loc = loc;
}

function ObjectExpressionNode(properties, loc) {
	this.type = "ObjectExpression";
	this.properties = properties;
	this.loc = loc;
}

function FunctionExpressionNode(id, params, body, generator, expression, loc) {
	this.type = "FunctionExpression";
	this.id = id;
	this.params = params;
	this.body = body;
	this.generator = generator;
	this.expression = expression;
	this.loc = loc;
}

function SequenceExpressionNode(expressions, loc) {
	this.type = "SequenceExpression";
	this.expressions = expressions;
	this.loc = loc;
}

function UnaryExpressionNode(operator, prefix, argument, loc) {
	this.type = "UnaryExpression";
	this.operator = operator;
	this.prefix = prefix;
	this.argument = argument;
	this.loc = loc;
}

function BinaryExpressionNode(operator, left, right, loc) {
	this.type = "BinaryExpression";
	this.operator = operator;
	this.left = left;
	this.right = right;
	this.loc = loc;
}

function AssignmentExpressionNode(operator, left, right, loc) {
	this.type = "AssignmentExpression";
	this.operator = operator;
	this.left = left;
	this.right = right;
	this.loc = loc;
}

function UpdateExpressionNode(operator, argument, prefix, loc) {
	this.type = "UpdateExpression";
	this.operator = operator;
	this.argument = argument;
	this.prefix = prefix;
	this.loc = loc;
}

function LogicalExpressionNode(operator, left, right, loc) {
	this.type = "LogicalExpression";
	this.operator = operator;
	this.left = left;
	this.right = right;
	this.loc = loc;
}

function ConditionalExpressionNode(test, consequent, alternate, loc) {
	this.type = "ConditionalExpression";
	this.test = test;
	this.consequent = consequent;
	this.alternate = alternate;
	this.loc = loc;
}

function NewExpressionNode(callee, args, loc) {
	this.type = "NewExpression";
	this.callee = callee;
	this.arguments = args;
	this.loc = loc;
}

function CallExpressionNode(callee, args, loc) {
	this.type = "CallExpression";
	this.callee = callee;
	this.arguments = args;
	this.loc = loc;
}

function MemberExpressionNode(object, property, computed, loc) {
	this.type = "MemberExpression";
	this.object = object;
	this.property = property;
	this.computed = computed;
	this.loc = loc;
}

function SwitchCaseNode(test, consequent, loc) {
	this.type = "SwitchCase";
	this.test = test;
	this.consequent = consequent;
	this.loc = loc;
}

function CatchClauseNode(param, body, loc) {
	this.type = "CatchClause";
	this.param = param;
	this.guard = null; /* Firefox specific */
	this.body = body;
	this.loc = loc;
}

function IdentifierNode(name, loc) {
	this.type = "Identifier";
	this.name = name;
	this.loc = loc;
}

function LiteralNode(value, loc) {
	this.type = "Literal";
	this.value = value;
	this.loc = loc;
}

function SourceLocation(source, start, end) {
	this.source = source;
	this.start = start;
	this.end = end;
}

function Position(line, column) {
	this.line = line;
	this.column = column;
}

/* Object and Array patterns are not part of the ECMAScript Standard
function ObjectPatternNode() {
	this.type = "ObjectPattern";
	this.properties = [];
}

function ArrayPatternNode() {
	this.type = "ArrayPattern";
	this.elements = [];
}
*/
/* End AST Node Constructors */

/* Expose the AST Node Constructors */
parser.ast = {};
parser.ast.ProgramNode = ProgramNode;
parser.ast.EmptyStatementNode = EmptyStatementNode;
parser.ast.BlockStatementNode = BlockStatementNode;
parser.ast.ExpressionStatementNode = ExpressionStatementNode;
parser.ast.IfStatementNode = IfStatementNode;
parser.ast.LabeledStatementNode = LabeledStatementNode;
parser.ast.BreakStatementNode = BreakStatementNode;
parser.ast.ContinueStatementNode = ContinueStatementNode;
parser.ast.WithStatementNode = WithStatementNode;
parser.ast.SwitchStatementNode = SwitchStatementNode;
parser.ast.ReturnStatementNode = ReturnStatementNode;
parser.ast.ThrowStatementNode = ThrowStatementNode;
parser.ast.TryStatementNode = TryStatementNode;
parser.ast.WhileStatementNode = WhileStatementNode;
parser.ast.DoWhileStatementNode = DoWhileStatementNode;
parser.ast.ForStatementNode = ForStatementNode;
parser.ast.ForInStatementNode = ForInStatementNode;
parser.ast.DebugggerStatementNode = DebugggerStatementNode;
parser.ast.FunctionDeclarationNode = FunctionDeclarationNode;
parser.ast.VariableDeclarationNode = VariableDeclarationNode;
parser.ast.VariableDeclaratorNode = VariableDeclaratorNode;
parser.ast.ThisExpressionNode = ThisExpressionNode;
parser.ast.ArrayExpressionNode = ArrayExpressionNode;
parser.ast.ObjectExpressionNode = ObjectExpressionNode;
parser.ast.FunctionExpressionNode = FunctionExpressionNode;
parser.ast.SequenceExpressionNode = SequenceExpressionNode;
parser.ast.UnaryExpressionNode = UnaryExpressionNode;
parser.ast.BinaryExpressionNode = BinaryExpressionNode;
parser.ast.AssignmentExpressionNode = AssignmentExpressionNode;
parser.ast.UpdateExpressionNode = UpdateExpressionNode;
parser.ast.LogicalExpressionNode = LogicalExpressionNode;
parser.ast.ConditionalExpressionNode = ConditionalExpressionNode;
parser.ast.NewExpressionNode = NewExpressionNode;
parser.ast.CallExpressionNode = CallExpressionNode;
parser.ast.MemberExpressionNode = MemberExpressionNode;
parser.ast.SwitchCaseNode = SwitchCaseNode;
parser.ast.CatchClauseNode = CatchClauseNode;
parser.ast.IdentifierNode = IdentifierNode;
parser.ast.LiteralNode = LiteralNode;
