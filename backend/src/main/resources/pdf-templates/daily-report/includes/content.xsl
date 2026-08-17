<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:include href="/pdf-templates/common/includes/branding.xsl"/>

    <xsl:template name="report-content">
        <fo:block font-family="Helvetica" start-indent="0pt" end-indent="0pt">
            <xsl:call-template name="title"/>
            <fo:block space-before="6mm">
                <xsl:call-template name="customers"/>
            </fo:block>
            <fo:block space-before="6mm">
                <xsl:call-template name="administration"/>
            </fo:block>
            <fo:block space-before="6mm">
                <xsl:call-template name="logistics"/>
            </fo:block>
            <fo:block space-before="6mm">
                <xsl:call-template name="shelters"/>
            </fo:block>
        </fo:block>
    </xsl:template>
    <xsl:template name="title">
        <xsl:call-template name="document-header">
            <xsl:with-param name="title" select="'Tagesreport TÖ Tafel 1030'"/>
            <xsl:with-param name="subtitle" select="date"/>
            <xsl:with-param name="logoContentType" select="logoContentType"/>
            <xsl:with-param name="logoBytes" select="logoBytes"/>
        </xsl:call-template>
    </xsl:template>
    <xsl:template name="customers">
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Lebensmittel erhalten'"/>
        </xsl:call-template>
        <xsl:call-template name="stat-row">
            <xsl:with-param name="label" select="'Kunden (Haushalte) / Personen'"/>
            <xsl:with-param name="value" select="concat(countCustomers, ' / ', countPersons)"/>
        </xsl:call-template>
        <xsl:call-template name="stat-row">
            <xsl:with-param name="label" select="'davon Kinder unter 3 Jahren'"/>
            <xsl:with-param name="value" select="countInfants"/>
        </xsl:call-template>
        <xsl:call-template name="stat-row">
            <xsl:with-param name="label" select="'Durchschnittliche Personen je Haushalt'"/>
            <xsl:with-param name="value" select="format-number(averagePersonsPerCustomer,'#.##0,00', 'decimal-format')"/>
        </xsl:call-template>
        <xsl:call-template name="stat-row">
            <xsl:with-param name="label" select="'davon Alleinerzieher (Haushalte)'"/>
            <xsl:with-param name="value" select="countSingleParentHouseholds"/>
        </xsl:call-template>
    </xsl:template>
    <xsl:template name="administration">
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Administration'"/>
        </xsl:call-template>
        <xsl:call-template name="stat-row">
            <xsl:with-param name="label" select="'Neue Kunden / Personen'"/>
            <xsl:with-param name="value" select="concat(countCustomersNew, ' / ', countPersonsNew)"/>
        </xsl:call-template>
        <xsl:call-template name="stat-row">
            <xsl:with-param name="label" select="'Verlängerte Kunden / Personen'"/>
            <xsl:with-param name="value" select="concat(countCustomersProlonged, ' / ', countPersonsProlonged)"/>
        </xsl:call-template>
        <xsl:call-template name="stat-row">
            <xsl:with-param name="label" select="'Sonstige Aktualisierungen'"/>
            <xsl:with-param name="value" select="countCustomersUpdated"/>
        </xsl:call-template>
        <xsl:call-template name="stat-row">
            <xsl:with-param name="label" select="'Beteiligte MitarbeiterInnen'"/>
            <xsl:with-param name="value" select="employeeCount"/>
        </xsl:call-template>
    </xsl:template>
    <xsl:template name="logistics">
        <xsl:if test="shopsTotalCount > 0">
            <xsl:call-template name="section-title">
                <xsl:with-param name="text" select="'Transport-Logistik'"/>
            </xsl:call-template>
            <xsl:call-template name="stat-row">
                <xsl:with-param name="label" select="'Spender gesamt / mit Ware'"/>
                <xsl:with-param name="value" select="concat(shopsTotalCount, ' / ', shopsWithFoodCount)"/>
            </xsl:call-template>
            <xsl:call-template name="stat-row">
                <xsl:with-param name="label" select="'Waren-Menge'"/>
                <xsl:with-param name="value" select="concat(format-number(foodTotalAmount,'#.##0,00', 'decimal-format'), ' kg')"/>
            </xsl:call-template>
            <xsl:call-template name="stat-row">
                <xsl:with-param name="label" select="'Durchschnittliche Menge / Spender'"/>
                <xsl:with-param name="value" select="concat(format-number(foodPerShopAverage,'#.##0,00', 'decimal-format'), ' kg')"/>
            </xsl:call-template>
            <xsl:call-template name="stat-row">
                <xsl:with-param name="label" select="'Routen-Länge'"/>
                <xsl:with-param name="value" select="concat(routesLengthKm, ' km')"/>
            </xsl:call-template>
        </xsl:if>
    </xsl:template>
    <xsl:template name="shelters">
        <xsl:if test="personsInSheltersTotalCount > 0">
            <xsl:call-template name="section-title">
                <xsl:with-param name="text" select="'An Nächtigungsquartiere (Personen)'"/>
            </xsl:call-template>
            <fo:table table-layout="fixed" width="100%">
                <fo:table-column column-width="55%"/>
                <fo:table-column column-width="30%"/>
                <fo:table-column column-width="15%"/>
                <fo:table-header>
                    <fo:table-row>
                        <fo:table-cell padding-bottom="1mm" border-bottom="0.4mm solid {$tafelHairline}">
                            <fo:block font-size="8pt" font-weight="bold" color="{$tafelMuted}">Notschlafstelle</fo:block>
                        </fo:table-cell>
                        <fo:table-cell padding-bottom="1mm" border-bottom="0.4mm solid {$tafelHairline}">
                            <fo:block font-size="8pt" font-weight="bold" color="{$tafelMuted}">Adresse</fo:block>
                        </fo:table-cell>
                        <fo:table-cell padding-bottom="1mm" border-bottom="0.4mm solid {$tafelHairline}" text-align="right">
                            <fo:block font-size="8pt" font-weight="bold" color="{$tafelMuted}">Personen</fo:block>
                        </fo:table-cell>
                    </fo:table-row>
                </fo:table-header>
                <fo:table-body>
                    <xsl:for-each select="shelters/shelters">
                        <fo:table-row>
                            <fo:table-cell padding-top="2mm" padding-bottom="2mm"
                                           border-bottom="0.25mm solid {$tafelHairline}">
                                <fo:block font-weight="bold" color="{$tafelInk}">
                                    <xsl:value-of select="name"/>
                                </fo:block>
                            </fo:table-cell>
                            <fo:table-cell padding-top="2mm" padding-bottom="2mm"
                                           border-bottom="0.25mm solid {$tafelHairline}">
                                <fo:block color="{$tafelInk}">
                                    <xsl:value-of select="addressFormatted"/>
                                </fo:block>
                            </fo:table-cell>
                            <fo:table-cell padding-top="2mm" padding-bottom="2mm" text-align="right"
                                           border-bottom="0.25mm solid {$tafelHairline}">
                                <fo:block font-weight="bold" color="{$tafelInk}">
                                    <xsl:value-of select="personCount"/>
                                </fo:block>
                            </fo:table-cell>
                        </fo:table-row>
                    </xsl:for-each>
                    <fo:table-row>
                        <fo:table-cell number-columns-spanned="2" padding-top="2mm">
                            <fo:block font-weight="bold" color="{$tafelInk}">Personen gesamt</fo:block>
                        </fo:table-cell>
                        <fo:table-cell padding-top="2mm" text-align="right">
                            <fo:block font-weight="bold" color="{$tafelInk}">
                                <xsl:value-of select="personsInSheltersTotalCount"/>
                            </fo:block>
                        </fo:table-cell>
                    </fo:table-row>
                </fo:table-body>
            </fo:table>
        </xsl:if>
    </xsl:template>
</xsl:stylesheet>
