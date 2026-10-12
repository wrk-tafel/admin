<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:include href="/pdf-templates/common/includes/branding.xsl"/>
    <xsl:include href="/pdf-templates/customer-pdf/includes/masterdata.xsl"/>
    <xsl:include href="/pdf-templates/customer-pdf/includes/idcard.xsl"/>
    <!--
        Both household documents in one file, each exactly as its own stylesheet renders it. The
        card comes first: its two pages are the two sides of one sheet in a duplex print, which
        only holds while it starts on an odd page - behind a master data sheet of unknown length
        it would not.
    -->
    <xsl:template match="data">
        <fo:root xmlns:fo="http://www.w3.org/1999/XSL/Format">
            <fo:layout-master-set>
                <xsl:call-template name="idcard-page-master"/>
                <xsl:call-template name="masterdata-page-master"/>
            </fo:layout-master-set>
            <xsl:call-template name="idcard-page-sequence"/>
            <xsl:call-template name="masterdata-page-sequence"/>
        </fo:root>
    </xsl:template>
</xsl:stylesheet>