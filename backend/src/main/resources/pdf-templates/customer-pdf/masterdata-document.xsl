<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:include href="/pdf-templates/common/includes/branding.xsl"/>
    <xsl:include href="/pdf-templates/customer-pdf/includes/masterdata.xsl"/>
    <xsl:template match="data">
        <fo:root xmlns:fo="http://www.w3.org/1999/XSL/Format">
            <fo:layout-master-set>
                <xsl:call-template name="masterdata-page-master"/>
            </fo:layout-master-set>
            <xsl:call-template name="masterdata-page-sequence"/>
        </fo:root>
    </xsl:template>
</xsl:stylesheet>