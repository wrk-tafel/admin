<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:include href="/pdf-templates/common/includes/branding.xsl"/>

    <xsl:template name="masterdata">
        <fo:block font-family="Helvetica" start-indent="0pt" end-indent="0pt">
            <xsl:call-template name="masterdata-header"/>
            <fo:block space-after="5mm">
                <xsl:call-template name="masterdata-body"/>
            </fo:block>
            <xsl:call-template name="masterdata-footer"/>
        </fo:block>
    </xsl:template>

    <xsl:template name="masterdata-header">
        <xsl:call-template name="document-header">
            <xsl:with-param name="title" select="'Stammdatenblatt'"/>
            <xsl:with-param name="subtitle" select="concat('Kundennummer ', ./customer/id)"/>
            <xsl:with-param name="logoContentType" select="./logoContentType"/>
            <xsl:with-param name="logoBytes" select="./logoBytes"/>
        </xsl:call-template>
    </xsl:template>

    <xsl:template name="masterdata-field-grid">
        <xsl:param name="data"/>
        <fo:table table-layout="fixed" width="100%">
            <fo:table-column column-width="50%"/>
            <fo:table-column column-width="50%"/>
            <fo:table-body>
                <fo:table-row>
                    <fo:table-cell padding="1.5mm">
                        <xsl:call-template name="field-with-label">
                            <xsl:with-param name="value" select="$data/lastname"/>
                            <xsl:with-param name="label" select="'Nachname'"/>
                        </xsl:call-template>
                    </fo:table-cell>
                    <fo:table-cell padding="1.5mm">
                        <xsl:call-template name="field-with-label">
                            <xsl:with-param name="value" select="$data/firstname"/>
                            <xsl:with-param name="label" select="'Vorname'"/>
                        </xsl:call-template>
                    </fo:table-cell>
                </fo:table-row>
                <fo:table-row>
                    <fo:table-cell padding="1.5mm">
                        <xsl:call-template name="field-with-label">
                            <xsl:with-param name="value" select="$data/birthDate"/>
                            <xsl:with-param name="label" select="'Geburtsdatum'"/>
                        </xsl:call-template>
                    </fo:table-cell>
                    <fo:table-cell padding="1.5mm">
                        <xsl:call-template name="field-with-label">
                            <xsl:with-param name="value" select="$data/gender"/>
                            <xsl:with-param name="label" select="'Geschlecht'"/>
                        </xsl:call-template>
                    </fo:table-cell>
                </fo:table-row>
                <fo:table-row>
                    <fo:table-cell padding="1.5mm" number-columns-spanned="2">
                        <xsl:call-template name="field-with-label">
                            <xsl:with-param name="value" select="$data/country"/>
                            <xsl:with-param name="label" select="'Nationalität'"/>
                        </xsl:call-template>
                    </fo:table-cell>
                </fo:table-row>
                <fo:table-row>
                    <fo:table-cell padding="1.5mm" number-columns-spanned="2">
                        <xsl:variable name="streetValue">
                            <xsl:value-of select="$data/address/street"/>
                            <xsl:if test="$data/address/houseNumber != '-'">
                                <xsl:value-of select="concat(' ', $data/address/houseNumber)"/>
                            </xsl:if>
                            <xsl:if test="$data/address/stairway != '-'">
                                <xsl:value-of select="concat(', Stiege ', $data/address/stairway)"/>
                            </xsl:if>
                            <xsl:if test="$data/address/door != '-'">
                                <xsl:value-of select="concat(' Top ', $data/address/door)"/>
                            </xsl:if>
                        </xsl:variable>
                        <xsl:call-template name="field-with-label">
                            <xsl:with-param name="value" select="$streetValue"/>
                            <xsl:with-param name="label" select="'Straße / Hausnummer / Stiege / Top'"/>
                        </xsl:call-template>
                    </fo:table-cell>
                </fo:table-row>
                <fo:table-row>
                    <fo:table-cell padding="1.5mm">
                        <xsl:call-template name="field-with-label">
                            <xsl:with-param name="value" select="$data/address/postalCode"/>
                            <xsl:with-param name="label" select="'PLZ'"/>
                        </xsl:call-template>
                    </fo:table-cell>
                    <fo:table-cell padding="1.5mm">
                        <xsl:call-template name="field-with-label">
                            <xsl:with-param name="value" select="$data/address/city"/>
                            <xsl:with-param name="label" select="'Ort'"/>
                        </xsl:call-template>
                    </fo:table-cell>
                </fo:table-row>
                <fo:table-row>
                    <fo:table-cell padding="1.5mm">
                        <xsl:call-template name="field-with-label">
                            <xsl:with-param name="value" select="$data/telephoneNumber"/>
                            <xsl:with-param name="label" select="'Telefonnummer'"/>
                        </xsl:call-template>
                    </fo:table-cell>
                    <fo:table-cell padding="1.5mm">
                        <xsl:call-template name="field-with-label">
                            <xsl:with-param name="value" select="$data/email"/>
                            <xsl:with-param name="label" select="'E-Mail'"/>
                        </xsl:call-template>
                    </fo:table-cell>
                </fo:table-row>
                <fo:table-row>
                    <fo:table-cell padding="1.5mm" number-columns-spanned="2">
                        <xsl:call-template name="field-with-label">
                            <xsl:with-param name="value" select="$data/employer"/>
                            <xsl:with-param name="label" select="'Arbeitgeber'"/>
                        </xsl:call-template>
                    </fo:table-cell>
                </fo:table-row>
                <fo:table-row>
                    <fo:table-cell padding="1.5mm">
                        <xsl:call-template name="field-with-label">
                            <xsl:with-param name="value" select="$data/income"/>
                            <xsl:with-param name="label" select="'Einkommen'"/>
                        </xsl:call-template>
                    </fo:table-cell>
                    <fo:table-cell padding="1.5mm">
                        <xsl:call-template name="field-with-label">
                            <xsl:with-param name="value" select="$data/incomeDueDate"/>
                            <xsl:with-param name="label" select="'Einkommen gültig bis'"/>
                        </xsl:call-template>
                    </fo:table-cell>
                </fo:table-row>
            </fo:table-body>
        </fo:table>
    </xsl:template>

    <xsl:template name="masterdata-customerData">
        <xsl:param name="data"/>
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Hauptbezieher'"/>
        </xsl:call-template>
        <xsl:call-template name="masterdata-field-grid">
            <xsl:with-param name="data" select="$data"/>
        </xsl:call-template>
    </xsl:template>

    <!--
        Deliberately lighter than the main person's field-with-label grid: additional persons only
        ever carry a handful of secondary attributes, and with several of them potentially listed
        in the narrow side column, a full field grid per person would push the sheet onto a second
        page for a household of any size.
    -->
    <xsl:template name="masterdata-additionalPersons">
        <xsl:param name="data"/>
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Weitere Personen'"/>
        </xsl:call-template>
        <xsl:choose>
            <xsl:when test="$data/additionalPersons != ''">
                <fo:table table-layout="fixed" width="100%">
                    <fo:table-column column-width="100%"/>
                    <fo:table-body>
                        <xsl:for-each select="$data/additionalPersons">
                            <fo:table-row>
                                <fo:table-cell padding-top="2mm" padding-bottom="2mm"
                                               border-bottom="0.25mm solid {$tafelHairline}">
                                    <fo:block font-weight="bold" font-size="10pt" color="{$tafelInk}" space-after="1mm">
                                        <xsl:value-of select="concat(./lastname, ' ', ./firstname)"/>
                                        <xsl:if test="./excludeFromHousehold = 'true'">
                                            <xsl:text>  </xsl:text>
                                            <fo:inline padding-top="0.3mm" padding-bottom="0.3mm" padding-left="1.5mm"
                                                       padding-right="1.5mm" font-size="7pt"
                                                       font-weight="bold" color="{$tafelInk}"
                                                       border="0.3mm solid {$tafelAccent}"
                                                       background-color="{$tafelAccentTint}">
                                                NICHT IM HAUSHALT
                                            </fo:inline>
                                        </xsl:if>
                                    </fo:block>
                                    <fo:block font-size="8.5pt" color="{$tafelMuted}">
                                        <xsl:if test="./birthDate != '-'">
                                            <xsl:value-of select="./birthDate"/>
                                        </xsl:if>
                                        <xsl:if test="./gender != '-'">
                                            <xsl:if test="./birthDate != '-'">
                                                <xsl:value-of select="' · '"/>
                                            </xsl:if>
                                            <xsl:value-of select="./gender"/>
                                        </xsl:if>
                                        <xsl:if test="./country != '-'">
                                            <xsl:if test="./birthDate != '-' or ./gender != '-'">
                                                <xsl:value-of select="' · '"/>
                                            </xsl:if>
                                            <xsl:value-of select="./country"/>
                                        </xsl:if>
                                    </fo:block>
                                    <xsl:if test="./employer != '-' or ./income != '-'">
                                        <fo:block font-size="8.5pt" color="{$tafelMuted}" space-before="0.5mm">
                                            <xsl:if test="./employer != '-'">
                                                <xsl:value-of select="./employer"/>
                                            </xsl:if>
                                            <xsl:if test="./employer != '-' and ./income != '-'">
                                                <xsl:value-of select="' · '"/>
                                            </xsl:if>
                                            <xsl:if test="./income != '-'">
                                                <xsl:value-of select="./income"/>
                                                <xsl:if test="./incomeDueDate != '-'">
                                                    <xsl:value-of select="concat(' bis ', ./incomeDueDate)"/>
                                                </xsl:if>
                                            </xsl:if>
                                        </fo:block>
                                    </xsl:if>
                                </fo:table-cell>
                            </fo:table-row>
                        </xsl:for-each>
                    </fo:table-body>
                </fo:table>
            </xsl:when>
            <xsl:otherwise>
                <fo:block color="{$tafelMuted}">Keine weiteren Personen</fo:block>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template name="masterdata-body">
        <fo:table table-layout="fixed" width="100%">
            <fo:table-column column-width="62%"/>
            <fo:table-column column-width="38%"/>
            <fo:table-body>
                <fo:table-row>
                    <fo:table-cell padding-right="5mm">
                        <xsl:call-template name="masterdata-customerData">
                            <xsl:with-param name="data" select="./customer"/>
                        </xsl:call-template>
                    </fo:table-cell>
                    <fo:table-cell padding-left="5mm" border-left="0.25mm solid {$tafelHairline}">
                        <xsl:call-template name="masterdata-additionalPersons">
                            <xsl:with-param name="data" select="./customer/additionalPersons"/>
                        </xsl:call-template>
                    </fo:table-cell>
                </fo:table-row>
            </fo:table-body>
        </fo:table>
    </xsl:template>

    <xsl:template name="masterdata-footer">
        <fo:block background-color="{$tafelAccentTint}" padding="3mm" space-before="4mm">
            <xsl:call-template name="stat-row">
                <xsl:with-param name="label" select="'Anzahl der Personen im gemeinsamen Haushalt'"/>
                <xsl:with-param name="value" select="./countPersons"/>
            </xsl:call-template>
            <xsl:call-template name="stat-row">
                <xsl:with-param name="label" select="'davon Kinder bis 3 Jahre'"/>
                <xsl:with-param name="value" select="./countInfants"/>
            </xsl:call-template>
        </fo:block>
        <fo:block space-before="5mm">
            <fo:table table-layout="fixed" width="100%">
                <fo:table-column column-width="60%"/>
                <fo:table-column column-width="40%"/>
                <fo:table-body>
                    <fo:table-row>
                        <fo:table-cell padding-right="4mm">
                            <xsl:call-template name="field-with-label">
                                <xsl:with-param name="value">
                                    <xsl:choose>
                                        <xsl:when test="./issuer != ''">
                                            <xsl:value-of select="concat(./issuedAtDate, ' · ', ./issuer)"/>
                                        </xsl:when>
                                        <xsl:otherwise>
                                            <xsl:value-of select="./issuedAtDate"/>
                                        </xsl:otherwise>
                                    </xsl:choose>
                                </xsl:with-param>
                                <xsl:with-param name="label" select="'Datum, ausgestellt von'"/>
                            </xsl:call-template>
                        </fo:table-cell>
                        <fo:table-cell>
                            <xsl:call-template name="field-with-label">
                                <xsl:with-param name="value" select="./customer/validUntilDate"/>
                                <xsl:with-param name="label" select="'Gültig bis'"/>
                            </xsl:call-template>
                        </fo:table-cell>
                    </fo:table-row>
                </fo:table-body>
            </fo:table>
        </fo:block>
    </xsl:template>
</xsl:stylesheet>
