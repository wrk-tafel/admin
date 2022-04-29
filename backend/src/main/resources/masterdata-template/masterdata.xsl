<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.1" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:fo="http://www.w3.org/1999/XSL/Format" exclude-result-prefixes="fo">
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
                    <fo:block font-family="Helvetica" font-size="16pt" font-weight="bold" space-after="5mm">
                        <xsl:call-template name="header"/>
                    </fo:block>
                </fo:flow>
            </fo:page-sequence>
        </fo:root>
    </xsl:template>
    <xsl:template name="header">
        <fo:block>
            <fo:table table-layout="fixed" width="100%" border-collapse="separate">
                <fo:table-column column-width="12cm"/>
                <fo:table-column column-width="4cm"/>
                <fo:table-body>
                    <fo:table-row>
                        <fo:table-cell>
                            <fo:block font-size="16pt">Stammdatenblatt</fo:block>
                        </fo:table-cell>
                        <fo:table-cell>
                            <fo:block>
                                <fo:external-graphic content-height="8cm" content-width="4cm">
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
                </fo:table-body>
            </fo:table>
        </fo:block>
    </xsl:template>
</xsl:stylesheet>