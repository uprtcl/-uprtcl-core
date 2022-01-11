(window.webpackJsonp=window.webpackJsonp||[]).push([[8],{422:function(e,t,a){"use strict";a.r(t);var i=a(55),o=Object(i.a)({},(function(){var e=this,t=e.$createElement,a=e._self._c||t;return a("ContentSlotsDistributor",{attrs:{"slot-key":e.$parent.slotKey}},[a("h1",{attrs:{id:"introduction"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#introduction"}},[e._v("#")]),e._v(" Introduction")]),e._v(" "),a("p",[e._v("_Prtcl makes a clear distinction between an app and its data. _Prtcl applications offer unique and reusable references to each digital object they handle. This is the basic feature on top of which interoperability is built.")]),e._v(" "),a("h2",{attrs:{id:"where-is-data-stored-in-a-prtcl-application"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#where-is-data-stored-in-a-prtcl-application"}},[e._v("#")]),e._v(" Where is data stored in a _Prtcl application?")]),e._v(" "),a("p",[e._v('When we say "data", we mean static, linked, JSON objects, each with unique identifiers.')]),e._v(" "),a("p",[e._v('_Prtcl applications can handle data stored on different platforms or "remotes" where each data object has a global unique identifier that we refer to as the "perspective id".')]),e._v(" "),a("p",[e._v('The word "perspective" is pretty much the way "a data object" is called in _Prtcl. It\'s called this way because objects can have many "forks", and thus each one is "one perspective" of the same "thing". We then call that "thing" an "Evee".')]),e._v(" "),a("p",[e._v('An Evee is a virtual object with many "perspectives" on different platforms and controlled by different authors.')]),e._v(" "),a("p",[e._v("A perspective id is similar to a URL in the sense that it is a global and unique "),a("em",[e._v("locator")]),e._v(" for that perspective, however it is also similar to a GIT branch in the sense that it resolves into the hash of the latest "),a("em",[e._v("commit")]),e._v(" of that perspective.")]),e._v(" "),a("p",[e._v("The head commit itself then codifies the entire version history of that perspective and the current/latest version by having links to the hash of the current data and to parent commits.")]),e._v(" "),a("p",[e._v("The figure below shows how one Evee evolves. Initially the evee has one perspective "),a("code",[e._v("zbP1")]),e._v(", that is updated to a commit "),a("code",[e._v("QmC3")]),e._v(" and which is then forked into another perspective "),a("code",[e._v("zbP2")]),e._v(", each with two new commits "),a("code",[e._v("QmC5")]),e._v(" and "),a("code",[e._v("QmC4")]),e._v(".")]),e._v(" "),a("p",[a("img",{attrs:{src:"https://docs.google.com/drawings/d/e/2PACX-1vSlA1MRL3bRrnBaHmtT-QwCPYiyOV0yBntl1-Go2MZaekMfH2SMEBtSEmP380dOonuLTlPqQuCb9Zm0/pub?w=600&h=400",alt:""}})]),e._v(" "),a("h2",{attrs:{id:"how-is-data-used-by-a-prtcl-application"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#how-is-data-used-by-a-prtcl-application"}},[e._v("#")]),e._v(" How is data used by a _Prtcl application?")]),e._v(" "),a("p",[e._v("_Prtcl vison is not too different from one of a world of applications all of them offering an open and standard API to their data. It can be implemented in Web2 applications, on top of open and standard APIs and/or on Web3, where data, by definition is not wall-gardened by any single entity.")]),e._v(" "),a("p",[e._v('A "Client Remote" is a platform or network from which a perspective\'s current head commit can be read and updated. A remote is included as part of an application using a javascript connector class.')]),e._v(" "),a("p",[e._v("_Prtcl wants to support two use cases:")]),e._v(" "),a("ul",[a("li",[e._v("One-application-multiple-remotes (OAMR): Where one application show objects that are stored on one or more remotes.")]),e._v(" "),a("li",[e._v("One-object-multiple-applications (OOMA): Where one object is showned and interacted-with from different applications.")])]),e._v(" "),a("p",[e._v("In the figure below, one application is handling content from three different platforms: A web-server, OrbitDB and Ethereum.")]),e._v(" "),a("p",[a("img",{attrs:{src:"https://docs.google.com/drawings/d/e/2PACX-1vSbcI2SNPOy0QRSYzg-lYUKfSEkXtvQTuqH72hiQCnXoElPZPUZNGAww_LuQwSK27M9pn-5EQkNEQCY/pub?w=600&h=400",alt:""}})]),e._v(" "),a("h2",{attrs:{id:"separation-between-client-remotes-and-entities-remotes"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#separation-between-client-remotes-and-entities-remotes"}},[e._v("#")]),e._v(' Separation between Client Remotes and "Entities" Remotes')]),e._v(" "),a("p",[e._v("In _Prtcl, there is a clear distinction between Client Remotes, which are platforms that store "),a("strong",[e._v("mutable")]),e._v(' references and can, thus, store and update the hash of the latest commit of a given perspective, and "Entity Remotes", which are platforms that store the hashed and inmutable objects themselves.')]),e._v(" "),a("p",[e._v("An application can use one or more Entity Remotes to store the same hashed objects. This is because an Entity Remote cannot manipulate the data it stores without changing its hash and, thus, it doest not need to be trusted the same way a Client Remote does.")]),e._v(" "),a("p",[e._v("A single platform, such as a web server, can play the role both of a Client Remote and an Entity Remote, storing both the current head of each perspective, as long as it's associated entities.")]),e._v(" "),a("p",[e._v("Separating between Client Remotes and Entity Remotes at the architecture level let's applications use different platforms for each function. In the case of Web3, it keeps the memory footprint on the consunsus layer that keeps the mutable references minimal and limited to a single hash, while the storage of the actual data is moved into a data-availability layer.")]),e._v(" "),a("p",[e._v("Making explicit the Client Remotes and Entities Remote on the previous figure would result in the figure below. Note that both OrbitDB and Ethereum use the same Entity Remote (IPFS).")]),e._v(" "),a("p",[a("img",{attrs:{src:"https://docs.google.com/drawings/d/e/2PACX-1vTXuJlFy6Og_Eu3ECRsJMAuLcVtpqOTiFTtP9qaoRSbwfdpiGLuOnDu2E1igqvUvkG9Pp3UcaMBGJuw/pub?w=600&h=800",alt:""}})]),e._v(" "),a("h2",{attrs:{id:"access-control"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#access-control"}},[e._v("#")]),e._v(" Access Control")]),e._v(" "),a("p",[e._v("Access control is determined by the remote platform and is not part of _Prtcl specification. Remotes can store public and private objects and include any authenticacion process. Applications will usually need to authenticate the current user to each remote independently.")]),e._v(" "),a("p",[e._v("If remotes use an authentication method based on public-private-key cryptography, it's then possible to use the same identity source (private-key) to authenticate one user into multiple remotes at once.")]),e._v(" "),a("p",[e._v("Requests to protected perspectives that are not accessible to the requesting user will simply not provide or update the current head of the perspective.")]),e._v(" "),a("p",[e._v("The only common function that is expected from remotes is a "),a("code",[e._v("canUpdate(perspectiveId, userId)")]),e._v("\nfunction that returns true or false if the user can indeed mutate the head of a given perspective.")])])}),[],!1,null,null,null);t.default=o.exports}}]);