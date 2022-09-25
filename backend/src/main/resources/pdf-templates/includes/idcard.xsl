<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:template name="idcard">
        <fo:block border="0.1mm dashed #000000" font-family="Helvetica" height="10cm"
                  page-break-after="always">
            <xsl:call-template name="outside"/>
        </fo:block>
        <fo:block border="0.1mm dashed #000000" font-family="Helvetica" height="10cm">
            <xsl:call-template name="inside"/>
        </fo:block>
    </xsl:template>
    <xsl:template name="outside">
        <fo:table table-layout="fixed" width="100%">
            <fo:table-column column-width="50%"/>
            <fo:table-column column-width="50%"/>
            <fo:table-body>
                <fo:table-row>
                    <fo:table-cell>
                        <fo:block>OUTSIDE PART 1</fo:block>
                    </fo:table-cell>
                    <fo:table-cell>
                        <fo:block>OUTSIDE PART 2</fo:block>
                    </fo:table-cell>
                </fo:table-row>
            </fo:table-body>
        </fo:table>
    </xsl:template>
    <xsl:template name="inside">
        <fo:table table-layout="fixed" width="100%">
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