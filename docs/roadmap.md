# IoT Agent Node.js Library

This product is a FIWARE Generic Enabler. If you would like to learn about the overall Roadmap of FIWARE, please check
"Roadmap" on the [FIWARE Catalogue](https://www.fiware.org/developers/catalogue/).

### Introduction

This section elaborates on proposed new features or tasks which are expected to be added to the product in the
foreseeable future. There should be no assumption of a commitment to deliver these features on specific dates or in the
order given. The development team will be doing their best to follow the proposed dates and priorities, but please bear
in mind that plans to work on a given feature or task may be revised. All information is provided as general guidelines
only, and this section may be revised to provide newer information at any time.

Disclaimer:

-   This section has been last updated in March 2020. Please take into account its content could be obsolete.
-   Note we develop this software in Agile way, so development plan is continuously under review. Thus, this roadmap has
    to be understood as rough plan of features to be done along time which is fully valid only at the time of writing
    it. This roadmap has not be understood as a commitment on features and/or dates.
-   Some of the roadmap items may be implemented by external community developers, out of the scope of GE owners. Thus,
    the moment in which these features will be finalized cannot be assured.

### Short term

The following list of features are planned to be addressed in the short term, and incorporated in a release of the
product:

-   Selectively ignore measure in the southbound interface (community)
-   JEXL support in expressions (community)
-   cgroup literal in configuration groups management API (community)
-   Metadata processing improvements
-   Add MongoDB authentication support

### Medium term

The following list of features are planned to be addressed in the medium term, typically within the subsequent
release(s) generated in the next 9 months after the next planned release:

-   Support for "delta" measures (i.e. "temperature _increased_ in 5 degress" instead of "temperature _is_ 25")
-   Removal support for NGSIv1 (which currently is deprecated)

### Long term

The following list of features are proposals regarding the longer-term evolution of the product even though the
development of these features has not yet been scheduled for a release in the near future. Please feel free to contact
us if you wish to get involved in the implementation or influence the roadmap:

-   Incremental introduccion of ECMAScript6 syntax (previous analysis of which sub-set of interesting aspect we want to
    take)
-   Use the lightweight ingestion mechanism for connection oriented updates implemented in Context Broker
