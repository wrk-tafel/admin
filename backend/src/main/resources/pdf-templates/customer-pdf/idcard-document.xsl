<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:include href="/pdf-templates/customer-pdf/includes/idcard.xsl"/>
    <xsl:template match="data">
        <fo:root xmlns:fo="http://www.w3.org/1999/XSL/Format">
            <fo:layout-master-set>
                <fo:simple-page-master master-name="simpleA4" page-height="29.7cm" page-width="21cm">
                    <fo:region-body/>
                </fo:simple-page-master>
            </fo:layout-master-set>
            <fo:page-sequence master-reference="simpleA4">
                <fo:flow flow-name="xsl-region-body">
                    <fo:block-container border-bottom="0.1mm dashed #000000"
                                        font-family="Helvetica"
                                        width="21cm" height="8cm"
                                        page-break-after="always">
                        <xsl:call-template name="idcard-outside"/>
                    </fo:block-container>
                    <fo:block-container border-bottom="0.1mm dashed #000000" font-family="Helvetica"
                                        width="21cm" height="8cm">
                        <xsl:call-template name="idcard-inside"/>
                    </fo:block-container>
                </fo:flow>
            </fo:page-sequence>
        </fo:root>
    </xsl:template>
</xsl:stylesheet>