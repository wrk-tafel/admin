<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:template name="report-content">
        <fo:block font-family="Helvetica" start-indent="0pt" end-indent="0pt">
            <fo:block>
                <xsl:call-template name="title"/>
            </fo:block>
            <fo:block>
                <xsl:call-template name="customers"/>
            </fo:block>
            <fo:block>
                <xsl:call-template name="administration"/>
            </fo:block>
            <fo:block>
                <xsl:call-template name="logistics"/>
            </fo:block>
            <fo:block>
                <xsl:call-template name="shelters"/>
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
                        <fo:block font-size="30pt" font-weight="bold" margin-left="1cm" margin-top="0.2cm">
                            Tagesreport Tafel 1030
                        </fo:block>
                        <fo:block font-size="25pt" margin-left="1cm">
                            <xsl:value-of select="date"/>
                        </fo:block>
                    </fo:table-cell>
                </fo:table-row>
            </fo:table-body>
        </fo:table>
    </xsl:template>
    <xsl:template name="customers">
        <fo:block font-weight="bold" margin-bottom="0.2cm" space-before="1cm">
            Lebensmittel erhalten
        </fo:block>
        <fo:block margin-left="1cm">
            <fo:table table-layout="fixed" width="100%">
                <fo:table-column column-width="50%"/>
                <fo:table-column column-width="50%"/>
                <fo:table-body>
                    <fo:table-row>
                        <fo:table-cell>
                            <fo:block>Kunden (Haushalte) / Personen:</fo:block>
                        </fo:table-cell>
                        <fo:table-cell>
                            <fo:block>
                                <xsl:value-of select="countCustomers"/>
                                <xsl:value-of select="' / '"/>
                                <xsl:value-of select="countPersons"/>
                            </fo:block>
                        </fo:table-cell>
                    </fo:table-row>
                    <fo:table-row>
                        <fo:table-cell>
                            <fo:block>davon Kinder &lt; 3 Jahre:</fo:block>
                        </fo:table-cell>
                        <fo:table-cell>
                            <fo:block>
                                <xsl:value-of select="countInfants"/>
                            </fo:block>
                        </fo:table-cell>
                    </fo:table-row>
                    <fo:table-row>
                        <fo:table-cell>
                            <fo:block>durchschn. Personen je Haushalt:</fo:block>
                        </fo:table-cell>
                        <fo:table-cell>
                            <fo:block>
                                <xsl:value-of select="format-number(averagePersonsPerCustomer,'#.##0,00', 'decimal-format')"/>
                            </fo:block>
                        </fo:table-cell>
                    </fo:table-row>
                </fo:table-body>
            </fo:table>
        </fo:block>
    </xsl:template>
    <xsl:template name="administration">
        <fo:block font-weight="bold" margin-bottom="0.2cm" space-before="1cm">
            Administration
        </fo:block>
        <fo:block margin-left="1cm">
            <fo:table table-layout="fixed" width="100%">
                <fo:table-column column-width="50%"/>
                <fo:table-column column-width="50%"/>
                <fo:table-body>
                    <fo:table-row>
                        <fo:table-cell>
                            <fo:block>neue Kunden / Personen:</fo:block>
                        </fo:table-cell>
                        <fo:table-cell>
                            <fo:block>
                                <xsl:value-of select="countCustomersNew"/>
                                <xsl:value-of select="' / '"/>
                                <xsl:value-of select="countPersonsNew"/>
                            </fo:block>
                        </fo:table-cell>
                    </fo:table-row>
                    <fo:table-row>
                        <fo:table-cell>
                            <fo:block>verlängerte Kunden / Personen:</fo:block>
                        </fo:table-cell>
                        <fo:table-cell>
                            <fo:block>
                                <xsl:value-of select="countCustomersProlonged"/>
                                <xsl:value-of select="' / '"/>
                                <xsl:value-of select="countPersonsProlonged"/>
                            </fo:block>
                        </fo:table-cell>
                    </fo:table-row>
                    <fo:table-row>
                        <fo:table-cell>
                            <fo:block>sonstige Aktualisierungen:</fo:block>
                        </fo:table-cell>
                        <fo:table-cell>
                            <fo:block>
                                <xsl:value-of select="countCustomersUpdated"/>
                            </fo:block>
                        </fo:table-cell>
                    </fo:table-row>
                    <fo:table-row>
                        <fo:table-cell>
                            <fo:block>Beteiligte MitarbeiterInnen:</fo:block>
                        </fo:table-cell>
                        <fo:table-cell>
                            <fo:block>
                                <xsl:value-of select="employeeCount"/>
                            </fo:block>
                        </fo:table-cell>
                    </fo:table-row>
                </fo:table-body>
            </fo:table>
        </fo:block>
    </xsl:template>
    <xsl:template name="logistics">
        <xsl:if test="shopsTotalCount > 0">
            <fo:block font-weight="bold" margin-bottom="0.2cm" space-before="1cm">
                Transport-Logistik
            </fo:block>
            <fo:block margin-left="1cm">
                <fo:table table-layout="fixed" width="100%">
                    <fo:table-column column-width="50%"/>
                    <fo:table-column column-width="50%"/>
                    <fo:table-body>
                        <fo:table-row>
                            <fo:table-cell>
                                <fo:block>Spender gesamt / mit Ware:</fo:block>
                            </fo:table-cell>
                            <fo:table-cell>
                                <fo:block>
                                    <xsl:value-of select="shopsTotalCount"/>
                                    <xsl:value-of select="' / '"/>
                                    <xsl:value-of select="shopsWithFoodCount"/>
                                </fo:block>
                            </fo:table-cell>
                        </fo:table-row>
                        <fo:table-row>
                            <fo:table-cell>
                                <fo:block>Waren-Menge:</fo:block>
                            </fo:table-cell>
                            <fo:table-cell>
                                <fo:block>
                                    <xsl:value-of select="format-number(foodTotalAmount,'#.##0,00', 'decimal-format')"/>
                                    <xsl:value-of select="' kg'"/>
                                </fo:block>
                            </fo:table-cell>
                        </fo:table-row>
                        <fo:table-row>
                            <fo:table-cell>
                                <fo:block>durchschnittliche Menge / Spender:</fo:block>
                            </fo:table-cell>
                            <fo:table-cell>
                                <fo:block>
                                    <xsl:value-of select="format-number(foodPerShopAverage,'#.##0,00', 'decimal-format')"/>
                                    <xsl:value-of select="' kg'"/>
                                </fo:block>
                            </fo:table-cell>
                        </fo:table-row>
                        <fo:table-row>
                            <fo:table-cell>
                                <fo:block>Routen-Länge:</fo:block>
                            </fo:table-cell>
                            <fo:table-cell>
                                <fo:block>
                                    <xsl:value-of select="routesLengthKm"/>
                                    <xsl:value-of select="' km'"/>
                                </fo:block>
                            </fo:table-cell>
                        </fo:table-row>
                    </fo:table-body>
                </fo:table>
            </fo:block>
        </xsl:if>
    </xsl:template>
    <xsl:template name="shelters">
        <xsl:if test="personsInSheltersTotalCount > 0">
            <fo:block font-weight="bold" margin-bottom="0.2cm" space-before="1cm">
                An Nächtigungsquartiere (Personen)
            </fo:block>
            <fo:block margin-left="1cm">
                <fo:table table-layout="fixed" width="100%">
                    <fo:table-column column-width="50%"/>
                    <fo:table-column column-width="50%"/>
                    <fo:table-body>
                        <xsl:for-each select="shelters/shelters">
                            <fo:table-row space-before="0.1cm">
                                <fo:table-cell>
                                    <fo:block font-weight="bold">
                                        <xsl:value-of select="name"/>
                                    </fo:block>
                                </fo:table-cell>
                                <fo:table-cell>
                                    <fo:block>
                                        <xsl:value-of select="personCount"/>
                                    </fo:block>
                                </fo:table-cell>
                            </fo:table-row>
                            <fo:table-row  keep-with-previous="always">
                                <fo:table-cell>
                                    <fo:block>
                                        <xsl:value-of select="addressFormatted"/>
                                    </fo:block>
                                </fo:table-cell>
                            </fo:table-row>
                        </xsl:for-each>
                        <fo:table-row>
                            <fo:table-cell number-columns-spanned="2">
                                <fo:block>
                                    <fo:leader leader-pattern="rule" leader-length="70%" rule-thickness="1pt" color="black"/>
                                </fo:block>
                            </fo:table-cell>
                        </fo:table-row>
                        <fo:table-row space-before="0.1cm">
                            <fo:table-cell>
                                <fo:block>Personen gesamt:</fo:block>
                            </fo:table-cell>
                            <fo:table-cell>
                                <fo:block>
                                    <xsl:value-of select="personsInSheltersTotalCount"/>
                                </fo:block>
                            </fo:table-cell>
                        </fo:table-row>
                    </fo:table-body>
                </fo:table>
            </fo:block>
        </xsl:if>
    </xsl:template>
</xsl:stylesheet>