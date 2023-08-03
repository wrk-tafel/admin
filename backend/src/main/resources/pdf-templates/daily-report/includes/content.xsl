<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:template name="report-content">
        <fo:block font-family="Helvetica" start-indent="0pt" end-indent="0pt">
            <fo:external-graphic content-width="4.7cm">
                <xsl:attribute name="src">
                    <xsl:text>url('data:</xsl:text>
                    <xsl:value-of select="logoContentType"/>
                    <xsl:text>;base64,</xsl:text>
                    <xsl:value-of select="logoBytes"/>
                    <xsl:text>')</xsl:text>
                </xsl:attribute>
            </fo:external-graphic>
        </fo:block>
    </xsl:template>
</xsl:stylesheet>