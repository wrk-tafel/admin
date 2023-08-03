<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:template name="report-content">
        <fo:block font-family="Helvetica" start-indent="0pt" end-indent="0pt">
            <fo:block space-after="1cm">
                <xsl:call-template name="title"/>
            </fo:block>
            <fo:block space-after="1cm">
                <xsl:call-template name="title"/>
            </fo:block>
        </fo:block>
    </xsl:template>
    <xsl:template name="title">
        <fo:table table-layout="fixed" width="100%">
            <fo:table-column column-width="25%"/>
            <fo:table-column column-width="75%"/>
            <fo:table-body>
                <fo:table-row>
                    <fo:table-cell>
                        <fo:block>
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
                    </fo:table-cell>
                    <fo:table-cell>
                        <fo:block font-size="30pt" font-weight="bold" margin-left="1cm" margin-top="0.2cm">Tagesreport Tafel 1030</fo:block>
                        <fo:block font-size="25pt" margin-left="1cm">
                            <xsl:value-of select="date"/>
                        </fo:block>
                    </fo:table-cell>
                </fo:table-row>
            </fo:table-body>
        </fo:table>
    </xsl:template>
</xsl:stylesheet>