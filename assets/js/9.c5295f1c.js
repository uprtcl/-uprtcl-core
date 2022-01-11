(window.webpackJsonp=window.webpackJsonp||[]).push([[9],{424:function(t,e,a){"use strict";a.r(e);var s=a(55),r=Object(s.a)({},(function(){var t=this,e=t.$createElement,a=t._self._c||e;return a("ContentSlotsDistributor",{attrs:{"slot-key":t.$parent.slotKey}},[a("h1",{attrs:{id:"global-identifiers"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#global-identifiers"}},[t._v("#")]),t._v(" Global Identifiers")]),t._v(" "),a("p",[t._v("A perspective id is equivalent to a URL, except that")]),t._v(" "),a("ul",[a("li",[a("p",[t._v("It is expected to always return a string. That string will be the hash of a JSON object that will be the head commit (latest version) of that perspective.")])]),t._v(" "),a("li",[a("p",[t._v("It extends the supported locations (authority/remote) or URLs to not only web-servers but also web3 networks.")])])]),t._v(" "),a("p",[t._v("In addition, and since _Prtcl is already heavily reliant on the use of Entities (hashed objects), the perspective id is not a formatted string (as is a URL), but is the hash of a JSON object whose properties include all the perspective properties.")]),t._v(" "),a("p",[t._v("For example, a perspective that is stored on the ethereum xdai chain (ethereum network id 100) and governed by _Prtcl's smart contract could have the perspective id: "),a("code",[t._v("zb2wwrwEhBDLxcLdaeMqNB4uJem5unACXPB8zi5dGKACgbDYF")]),t._v(" since that hash resolves to the following object:")]),t._v(" "),a("div",{staticClass:"language-js extra-class"},[a("pre",{pre:!0,attrs:{class:"language-js"}},[a("code",[a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("const")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token literal-property property"}},[t._v("perspective")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" Perspective "),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n  "),a("span",{pre:!0,attrs:{class:"token literal-property property"}},[t._v("remote")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token string"}},[t._v("'eth-100'")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v("\n  "),a("span",{pre:!0,attrs:{class:"token literal-property property"}},[t._v("path")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token string"}},[t._v("'0xcfeb869f69431e42cdb54a4f4f105c19c080a601'")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v("\n  "),a("span",{pre:!0,attrs:{class:"token literal-property property"}},[t._v("creatorId")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token string"}},[t._v("'0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1'")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v("\n  "),a("span",{pre:!0,attrs:{class:"token literal-property property"}},[t._v("timestamp")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token number"}},[t._v("1631013963562")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v("\n  "),a("span",{pre:!0,attrs:{class:"token literal-property property"}},[t._v("context")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token string"}},[t._v("'zb2wwv9fxwCivCGLHbp7iF1QtoQKjyJVKTTHaBkpX4FCrb1MH'")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v("\n"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n\n"),a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("const")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token literal-property property"}},[t._v("perspectiveId")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" string "),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token function"}},[t._v("hashObject")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("perspective"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n"),a("span",{pre:!0,attrs:{class:"token comment"}},[t._v("// perspectiveId = zb2wwrwEhBDLxcLdaeMqNB4uJem5unACXPB8zi5dGKACgbDYF")]),t._v("\n")])])]),a("p",[t._v("Relying on hashes that encode the properties of the locator instead of a formatted string offers a condensed and flexible way for adding an arbitrary number of new and special properties to the locator without resulting on a very long string, at the expense of reducing it's human readibility.")]),t._v(" "),a("p",[t._v("The typescript interface of the "),a("code",[t._v("Perspective")]),t._v(" can be seen "),a("a",{attrs:{href:"https://github.com/uprtcl/js-uprtcl/blob/master/core/evees/src/evees/interfaces/types.ts#L7",target:"_blank",rel:"noopener noreferrer"}},[t._v("here"),a("OutboundLink")],1),t._v(".")]),t._v(" "),a("div",{staticClass:"language-ts extra-class"},[a("pre",{pre:!0,attrs:{class:"language-ts"}},[a("code",[a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("interface")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("Perspective")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n  remote"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("string")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n  path"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("string")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n  creatorId"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("string")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n  context"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("string")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n  timestamp"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("number")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n  meta"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("?")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("any")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token comment"}},[t._v("// optional parameters handle arbitrary metadata")]),t._v("\n"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),t._v("\n")])])]),a("p",[t._v("The optional "),a("code",[t._v("meta")]),t._v(' property can be used to add arbitrary properties similar to "query" attributes in a URL.')]),t._v(" "),a("h2",{attrs:{id:"offline-computation"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#offline-computation"}},[t._v("#")]),t._v(" Offline computation")]),t._v(" "),a("p",[t._v("_Prtcl applications must be able to compute the id of a perspective locally, without requesting it to the corresponding remote. This let's applications rapidly create new ids on the fly without having to wait for the remote to provide them.")]),t._v(" "),a("p",[t._v("Id collisions are avoided by having, at least, the "),a("code",[t._v("remote")]),t._v(", "),a("code",[t._v("creatorId")]),t._v(" and "),a("code",[t._v("timestamp")]),t._v(" properties as part of the perspective entity, and offering an optional "),a("code",[t._v("nonce")]),t._v(" property that can be used by the creating app to force different ids if necessary.")])])}),[],!1,null,null,null);e.default=r.exports}}]);