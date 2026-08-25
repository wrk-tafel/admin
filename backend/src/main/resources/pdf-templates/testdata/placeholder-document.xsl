<?xml version="1.0" encoding="UTF-8"?>
<!--
    A deliberately plain, standalone stylesheet (no branding.xsl include) for
    HouseholdTestdataDocumentSeeder's placeholder PDFs - these are local-development filler, not a
    user-facing document, so they don't need the application's letterhead.
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:template match="data">
        <fo:root xmlns:fo="http://www.w3.org/1999/XSL/Format">
            <fo:layout-master-set>
                <fo:simple-page-master master-name="simpleA4" page-height="29.7cm" page-width="21cm"
                                       margin-top="2cm" margin-bottom="2cm" margin-left="2cm" margin-right="2cm">
                    <fo:region-body/>
                </fo:simple-page-master>
            </fo:layout-master-set>
            <fo:page-sequence master-reference="simpleA4">
                <fo:flow flow-name="xsl-region-body">
                    <fo:block font-family="Helvetica" font-size="16pt" font-weight="bold" space-after="6mm">
                        <xsl:value-of select="title"/>
                    </fo:block>
                    <fo:block font-family="Helvetica" font-size="11pt">
                        <xsl:value-of select="body"/>
                    </fo:block>
                </fo:flow>
            </fo:page-sequence>
        </fo:root>
    </xsl:template>
</xsl:stylesheet>
