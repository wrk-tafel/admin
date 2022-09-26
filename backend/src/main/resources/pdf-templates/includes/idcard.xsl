<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:template name="idcard">
        <!--
        -->
        <fo:block-container border="0.1mm dashed #000000" font-family="Helvetica" height="8cm"
                            page-break-after="always">
            <xsl:call-template name="outside"/>
        </fo:block-container>
        <fo:block-container border="0.1mm dashed #000000" font-family="Helvetica" height="8cm">
            <xsl:call-template name="inside"/>
        </fo:block-container>
    </xsl:template>
    <xsl:template name="outside">
        <fo:table table-layout="fixed" width="100%">
            <fo:table-column column-width="50%"/>
            <fo:table-column column-width="50%"/>
            <fo:table-body>
                <fo:table-row>
                    <fo:table-cell>
                        <fo:block font-size="10pt" margin-top="6.75cm" margin-left="0.5cm">
                            Wiener Rotes Kreuz - Team Österreich Tafel
                        </fo:block>
                        <fo:block font-size="10pt" margin-left="0.5cm">
                            Safargasse 4, 1030 Wien
                        </fo:block>
                    </fo:table-cell>
                    <fo:table-cell>
                        <fo:block-container border-left="0.5mm solid #000000" height="8cm">
                            <xsl:call-template name="outside-front"/>
                        </fo:block-container>
                    </fo:table-cell>
                </fo:table-row>
            </fo:table-body>
        </fo:table>
    </xsl:template>
    <xsl:template name="outside-front">
        <fo:table table-layout="fixed" width="100%" text-align="center">
            <fo:table-column column-width="100%"/>
            <fo:table-body>
                <fo:table-row>
                    <fo:table-cell>
                        <fo:block margin-top="0.5cm">
                            <fo:external-graphic content-width="5.0cm">
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
                </fo:table-row>
                <fo:table-row>
                    <fo:table-cell>
                        <fo:block margin-top="0.5cm">
                            <fo:external-graphic content-width="3.0cm">
                                <xsl:attribute name="src">
                                    <xsl:text>url('data:</xsl:text>
                                    <xsl:value-of select="customer/idCard/qrCodeContentType"/>
                                    <xsl:text>;base64,</xsl:text>
                                    <xsl:value-of select="customer/idCard/qrCodeBytes"/>
                                    <xsl:text>')</xsl:text>
                                </xsl:attribute>
                            </fo:external-graphic>
                        </fo:block>
                    </fo:table-cell>
                </fo:table-row>
                <fo:table-row>
                    <fo:table-cell>
                        <fo:block margin-top="0.1cm">
                            <xsl:value-of select="customer/id"/>
                        </fo:block>
                    </fo:table-cell>
                </fo:table-row>
            </fo:table-body>
        </fo:table>
    </xsl:template>
    <xsl:template name="inside">
        <fo:table table-layout="fixed" width="100%" margin-left="0.25cm" margin-top="0.5cm">
            <fo:table-column column-width="50%"/>
            <fo:table-column column-width="50%"/>
            <fo:table-body>
                <fo:table-row>
                    <fo:table-cell>
                        <fo:block>INSIDE PART 1</fo:block>
                    </fo:table-cell>
                    <fo:table-cell>
                        <fo:block>INSIDE PART 2</fo:block>
                    </fo:table-cell>
                </fo:table-row>
            </fo:table-body>
        </fo:table>
    </xsl:template>
</xsl:stylesheet>