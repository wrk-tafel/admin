<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:include href="/pdf-templates/includes/masterdata.xsl"/>
    <xsl:include href="/pdf-templates/includes/idcard.xsl"/>
    <xsl:template match="data">
        <fo:root xmlns:fo="http://www.w3.org/1999/XSL/Format">
            <fo:layout-master-set>
                <fo:simple-page-master master-name="simpleA4" page-height="29.7cm" page-width="21cm">
                    <fo:region-body/>
                    <fo:region-after extent="8cm"/>
                </fo:simple-page-master>
            </fo:layout-master-set>
            <!-- First page - masterdata and idcard outside -->
            <fo:page-sequence master-reference="simpleA4">
                <fo:static-content flow-name="xsl-region-after">
                    <fo:block-container border-top="0.1mm dashed #000000" font-family="Helvetica" height="8cm">
                        <xsl:call-template name="idcard-outside"/>
                    </fo:block-container>
                </fo:static-content>
                <fo:flow flow-name="xsl-region-body">
                    <xsl:call-template name="masterdata"/>
                    <fo:block border-top="0.5mm solid #000000"/>
                </fo:flow>
            </fo:page-sequence>
            <!-- Second page - only idcard inside -->
            <fo:page-sequence master-reference="simpleA4">
                <fo:static-content flow-name="xsl-region-after">
                    <fo:block-container border-top="0.1mm dashed #000000" font-family="Helvetica" height="8cm">
                        <xsl:call-template name="idcard-inside"/>
                    </fo:block-container>
                </fo:static-content>
                <fo:flow flow-name="xsl-region-body">
                    <fo:block/>
                </fo:flow>
            </fo:page-sequence>
        </fo:root>
    </xsl:template>
</xsl:stylesheet>