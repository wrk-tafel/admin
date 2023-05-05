<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:template match="data">
        <fo:root xmlns:fo="http://www.w3.org/1999/XSL/Format">
            <fo:layout-master-set>
                <fo:simple-page-master master-name="simpleA4" page-height="29.7cm" page-width="21cm"
                                       margin-top="1cm" margin-bottom="1cm" margin-left="1cm" margin-right="1cm">
                    <fo:region-body/>
                </fo:simple-page-master>
            </fo:layout-master-set>
            <fo:page-sequence master-reference="simpleA4">
                <fo:flow flow-name="xsl-region-body">
                    <fo:block font-family="Helvetica">
                        <fo:block font-size="20pt" font-weight="bold" space-after="0.5cm">
                            <xsl:value-of select="title"/>
                        </fo:block>
                        <fo:block>
                            <xsl:call-template name="customerlist"/>
                        </fo:block>
                    </fo:block>
                </fo:flow>
            </fo:page-sequence>
        </fo:root>
    </xsl:template>

    <xsl:template name="customerlist">
        <fo:block start-indent="0pt" end-indent="0pt">
            <fo:table table-layout="fixed" width="100%">
                <fo:table-column column-width="10%"/>
                <fo:table-column column-width="40%"/>
                <fo:table-column column-width="25%"/>
                <fo:table-column column-width="25%"/>
                <fo:table-body>
                    <xsl:for-each select="customers/customers">
                        <fo:table-row>
                            <fo:table-cell>
                                <fo:block>
                                    <xsl:value-of select="ticketNumber"/>
                                </fo:block>
                            </fo:table-cell>
                            <fo:table-cell>
                                <fo:block>
                                    <xsl:value-of select="name"/>
                                </fo:block>
                            </fo:table-cell>
                            <fo:table-cell>
                                <fo:block>
                                    <xsl:value-of select="countPersons"/>
                                </fo:block>
                            </fo:table-cell>
                            <fo:table-cell>
                                <fo:block>
                                    <xsl:value-of select="countInfants"/>
                                </fo:block>
                            </fo:table-cell>
                        </fo:table-row>
                    </xsl:for-each>
                </fo:table-body>
            </fo:table>
        </fo:block>
    </xsl:template>
</xsl:stylesheet>
