<?xml version="1.0" encoding="UTF-8"?>
<!--
    Rendered once at startup by PdfWarmup and never shown to anyone. It goes through the same parts of
    FOP a real document does - the letterhead table with the embedded logo, regular and bold text in
    the bundled font - so the first PDF a user asks for doesn't pay for loading them.
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:include href="/pdf-templates/common/includes/branding.xsl"/>
    <xsl:template match="data">
        <fo:root xmlns:fo="http://www.w3.org/1999/XSL/Format" font-family="Helvetica">
            <fo:layout-master-set>
                <fo:simple-page-master master-name="simpleA4" page-height="29.7cm" page-width="21cm"
                                       margin-top="1cm" margin-bottom="1cm" margin-left="1cm" margin-right="1cm">
                    <fo:region-body/>
                </fo:simple-page-master>
            </fo:layout-master-set>
            <fo:page-sequence master-reference="simpleA4">
                <fo:flow flow-name="xsl-region-body">
                    <xsl:call-template name="document-header">
                        <xsl:with-param name="title" select="title"/>
                        <xsl:with-param name="logoContentType" select="logoContentType"/>
                        <xsl:with-param name="logoBytes" select="logoBytes"/>
                    </xsl:call-template>
                    <fo:block font-size="11pt" space-before="6mm">
                        <xsl:value-of select="text"/>
                    </fo:block>
                    <fo:block font-size="11pt" font-style="italic">
                        <xsl:value-of select="text"/>
                    </fo:block>
                </fo:flow>
            </fo:page-sequence>
        </fo:root>
    </xsl:template>
</xsl:stylesheet>
