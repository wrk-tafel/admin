<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:include href="/pdf-templates/common/includes/branding.xsl"/>

    <!--
        Printed on A4, then cut along the dashed lines and folded into a business-card-sized
        Bezugskarte: this "outside" page becomes the card's front and back cover, the "inside"
        page (below) becomes what's visible once it's unfolded.
    -->
    <xsl:template name="idcard-outside">
        <fo:table table-layout="fixed" width="100%">
            <fo:table-column column-width="50%"/>
            <fo:table-column column-width="50%"/>
            <fo:table-body>
                <fo:table-row>
                    <fo:table-cell padding="5mm">
                        <fo:block font-size="11pt" font-weight="bold" color="{$tafelAccent}" space-after="3mm">
                            Bezugskarte
                        </fo:block>
                        <xsl:call-template name="stat-row">
                            <xsl:with-param name="label" select="'Personen im gemeinsamen Haushalt'"/>
                            <xsl:with-param name="value" select="countPersons"/>
                        </xsl:call-template>
                        <xsl:call-template name="stat-row">
                            <xsl:with-param name="label" select="'davon unter 3 Jahren'"/>
                            <xsl:with-param name="value" select="countInfants"/>
                        </xsl:call-template>
                        <fo:block background-color="{$tafelAccentTint}" padding="3mm" space-before="4mm"
                                  font-size="8.5pt" font-weight="bold" color="{$tafelInk}">
                            Diese Bezugskarte ist Eigentum des Roten Kreuzes und ist auf Verlangen wieder
                            zurückzugeben.
                        </fo:block>
                        <fo:block font-size="8pt" color="{$tafelMuted}" space-before="3mm">
                            Wiener Rotes Kreuz – Team Österreich Tafel
                        </fo:block>
                        <fo:block font-size="8pt" color="{$tafelMuted}">
                            Safargasse 4, 1030 Wien
                        </fo:block>
                    </fo:table-cell>
                    <fo:table-cell>
                        <fo:block-container border-left="0.5mm solid {$tafelAccent}" height="8cm">
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
                        <fo:block margin-top="4mm">
                            <fo:external-graphic content-width="4.6cm">
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
                        <fo:block margin-top="3mm">
                            <fo:external-graphic content-width="2.7cm">
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
                        <fo:block margin-top="3mm">
                            <fo:inline padding="1mm 4mm" border="0.3mm solid {$tafelAccent}"
                                       background-color="{$tafelAccentTint}" font-weight="bold"
                                       color="{$tafelAccent}" font-size="11pt">
                                <xsl:value-of select="customer/id"/>
                            </fo:inline>
                        </fo:block>
                    </fo:table-cell>
                </fo:table-row>
            </fo:table-body>
        </fo:table>
    </xsl:template>

    <xsl:template name="idcard-inside">
        <fo:table table-layout="fixed" width="100%">
            <fo:table-column column-width="50%"/>
            <fo:table-column column-width="50%"/>
            <fo:table-body>
                <!--
                    Padding on the fo:table-cell (not on the fo:block-container it wraps - FOP
                    doesn't honor padding on a block-container nested in a table-cell, content
                    renders flush against it regardless) is what keeps text off the card edge / the
                    accent divider. That padding sits outside the block-container's own 8cm
                    (=cut-strip height), so the container's height is reduced by the same top+bottom
                    padding to keep the row's total at 8cm - otherwise it overflows past the dashed
                    cut line on the outside page.
                -->
                <fo:table-row>
                    <fo:table-cell padding-top="4mm" padding-bottom="2mm" padding-left="4mm" padding-right="3mm">
                        <fo:block-container height="7.4cm">
                            <xsl:call-template name="inside-left"/>
                        </fo:block-container>
                    </fo:table-cell>
                    <fo:table-cell padding-top="4mm" padding-bottom="2mm" padding-left="4mm" padding-right="3mm"
                                   border-left="0.5mm solid {$tafelAccent}">
                        <fo:block-container height="7.4cm">
                            <xsl:call-template name="inside-right"/>
                        </fo:block-container>
                    </fo:table-cell>
                </fo:table-row>
            </fo:table-body>
        </fo:table>
    </xsl:template>
    <xsl:template name="inside-left">
        <fo:block>
            <fo:block font-size="11pt" font-weight="bold" color="{$tafelAccent}" space-after="3mm">
                Hauptbezieher
            </fo:block>
            <fo:table table-layout="fixed" width="100%">
                <fo:table-column column-width="50%"/>
                <fo:table-column column-width="50%"/>
                <fo:table-body>
                    <fo:table-row>
                        <fo:table-cell padding-right="2mm" padding-bottom="3mm">
                            <xsl:call-template name="field-with-label">
                                <xsl:with-param name="value" select="customer/lastname"/>
                                <xsl:with-param name="label" select="'Nachname'"/>
                            </xsl:call-template>
                        </fo:table-cell>
                        <fo:table-cell padding-bottom="3mm">
                            <xsl:call-template name="field-with-label">
                                <xsl:with-param name="value" select="customer/firstname"/>
                                <xsl:with-param name="label" select="'Vorname'"/>
                            </xsl:call-template>
                        </fo:table-cell>
                    </fo:table-row>
                    <fo:table-row>
                        <fo:table-cell number-columns-spanned="2" padding-bottom="3mm">
                            <xsl:call-template name="field-with-label">
                                <xsl:with-param name="value" select="customer/birthDate"/>
                                <xsl:with-param name="label" select="'Geburtsdatum'"/>
                            </xsl:call-template>
                        </fo:table-cell>
                    </fo:table-row>
                    <fo:table-row>
                        <fo:table-cell number-columns-spanned="2" padding-bottom="3mm">
                            <xsl:variable name="streetValue">
                                <xsl:value-of select="customer/address/street"/>
                                <xsl:value-of select="' '"/>
                                <xsl:value-of select="customer/address/houseNumber"/>
                                <xsl:if test="customer/address/stairway != ''">
                                    <xsl:value-of select="', Stiege '"/>
                                    <xsl:value-of select="customer/address/stairway"/>
                                </xsl:if>
                                <xsl:if test="customer/address/door != ''">
                                    <xsl:value-of select="' Top '"/>
                                    <xsl:value-of select="customer/address/door"/>
                                </xsl:if>
                            </xsl:variable>
                            <xsl:call-template name="field-with-label">
                                <xsl:with-param name="value" select="$streetValue"/>
                                <xsl:with-param name="label" select="'Straße'"/>
                            </xsl:call-template>
                        </fo:table-cell>
                    </fo:table-row>
                    <fo:table-row>
                        <fo:table-cell number-columns-spanned="2" padding-bottom="3mm">
                            <xsl:variable name="cityValue">
                                <xsl:value-of select="customer/address/postalCode"/>
                                <xsl:value-of select="' '"/>
                                <xsl:value-of select="customer/address/city"/>
                            </xsl:variable>
                            <xsl:call-template name="field-with-label">
                                <xsl:with-param name="value" select="$cityValue"/>
                                <xsl:with-param name="label" select="'PLZ / Ort'"/>
                            </xsl:call-template>
                        </fo:table-cell>
                    </fo:table-row>
                    <fo:table-row>
                        <fo:table-cell padding-right="2mm">
                            <xsl:call-template name="field-with-label">
                                <xsl:with-param name="value" select="issuedAtDate"/>
                                <xsl:with-param name="label" select="'Ausgestellt am'"/>
                            </xsl:call-template>
                        </fo:table-cell>
                        <fo:table-cell>
                            <xsl:call-template name="field-with-label">
                                <xsl:with-param name="value" select="issuer"/>
                                <xsl:with-param name="label" select="'Ausgestellt von'"/>
                            </xsl:call-template>
                        </fo:table-cell>
                    </fo:table-row>
                </fo:table-body>
            </fo:table>
        </fo:block>
    </xsl:template>
    <xsl:template name="inside-right">
        <fo:block>
            <fo:block font-size="11pt" font-weight="bold" color="{$tafelAccent}" space-after="3mm">
                Weitere Personen
            </fo:block>
            <xsl:choose>
                <xsl:when test="customer/additionalPersons != ''">
                    <!--
                        The card panel is a fixed 7.4cm, unlike the master data sheet's full page,
                        so a large household's person list can't just run longer - past this many
                        names it would overflow past the dashed cut line onto the next panel's area.
                        Cut off with a "+N weitere" note instead; the full list still prints on the
                        master data sheet.
                    -->
                    <xsl:variable name="maxVisible" select="8"/>
                    <xsl:variable name="totalCount" select="count(customer/additionalPersons/additionalPersons)"/>
                    <fo:table table-layout="fixed" width="100%">
                        <fo:table-column column-width="100%"/>
                        <fo:table-body>
                            <xsl:for-each select="customer/additionalPersons/additionalPersons">
                                <xsl:if test="position() &lt;= $maxVisible">
                                    <fo:table-row>
                                        <fo:table-cell padding-top="1.5mm" padding-bottom="1.5mm"
                                                       border-bottom="0.25mm solid {$tafelHairline}">
                                            <fo:block font-size="10pt" color="{$tafelInk}">
                                                <xsl:value-of select="concat(./lastname, ' ', ./firstname)"/>
                                                <fo:inline color="{$tafelMuted}" font-size="8.5pt">
                                                    <xsl:value-of select="concat(' · ', ./birthDate)"/>
                                                </fo:inline>
                                            </fo:block>
                                        </fo:table-cell>
                                    </fo:table-row>
                                </xsl:if>
                            </xsl:for-each>
                            <xsl:if test="$totalCount &gt; $maxVisible">
                                <fo:table-row>
                                    <fo:table-cell padding-top="1.5mm">
                                        <fo:block font-size="9pt" font-style="italic" color="{$tafelMuted}">
                                            <xsl:value-of select="concat('+ ', $totalCount - $maxVisible, ' weitere (siehe Stammdatenblatt)')"/>
                                        </fo:block>
                                    </fo:table-cell>
                                </fo:table-row>
                            </xsl:if>
                        </fo:table-body>
                    </fo:table>
                </xsl:when>
                <xsl:otherwise>
                    <fo:block font-size="10pt" color="{$tafelMuted}">
                        Keine
                    </fo:block>
                </xsl:otherwise>
            </xsl:choose>
        </fo:block>
    </xsl:template>
</xsl:stylesheet>
