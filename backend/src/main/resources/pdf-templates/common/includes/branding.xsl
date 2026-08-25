<?xml version="1.0" encoding="UTF-8"?>
<!--
    Shared visual language for every Tafel PDF (ID card, master data sheet, daily report,
    distribution customer list): one accent palette plus the handful of building blocks
    (letterhead, section heading, labeled field, stat row) that give the four documents a
    consistent look even though each has its own page layout. Only "Helvetica" is available as
    a font-family - see fop-config.xml - so the visual system leans on color, rules and spacing
    rather than typeface variety.
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">

    <xsl:variable name="tafelAccent">#C8102E</xsl:variable>
    <xsl:variable name="tafelAccentTint">#FBEAEA</xsl:variable>
    <xsl:variable name="tafelInk">#1A1A1A</xsl:variable>
    <xsl:variable name="tafelMuted">#6B6B6B</xsl:variable>
    <xsl:variable name="tafelHairline">#D9D9D9</xsl:variable>

    <!--
        Letterhead used at the top of every full-page document (master data sheet, daily report,
        customer list). The ID card is its own small-format layout and does not use this.
    -->
    <xsl:template name="document-header">
        <xsl:param name="title"/>
        <xsl:param name="subtitle" select="''"/>
        <xsl:param name="logoContentType"/>
        <xsl:param name="logoBytes"/>
        <xsl:param name="logoWidth" select="'4cm'"/>
        <fo:table table-layout="fixed" width="100%">
            <fo:table-column column-width="70%"/>
            <fo:table-column column-width="30%"/>
            <fo:table-body>
                <fo:table-row>
                    <fo:table-cell display-align="center">
                        <fo:block font-size="22pt" font-weight="bold" color="{$tafelInk}">
                            <xsl:value-of select="$title"/>
                        </fo:block>
                        <xsl:if test="$subtitle != ''">
                            <fo:block font-size="12pt" color="{$tafelMuted}" space-before="2mm">
                                <xsl:value-of select="$subtitle"/>
                            </fo:block>
                        </xsl:if>
                    </fo:table-cell>
                    <fo:table-cell display-align="center" text-align="right">
                        <fo:block>
                            <fo:external-graphic content-width="{$logoWidth}">
                                <xsl:attribute name="src">
                                    <xsl:text>url('data:</xsl:text>
                                    <xsl:value-of select="$logoContentType"/>
                                    <xsl:text>;base64,</xsl:text>
                                    <xsl:value-of select="$logoBytes"/>
                                    <xsl:text>')</xsl:text>
                                </xsl:attribute>
                            </fo:external-graphic>
                        </fo:block>
                    </fo:table-cell>
                </fo:table-row>
            </fo:table-body>
        </fo:table>
        <fo:block border-bottom="1.2mm solid {$tafelAccent}" space-before="3mm" space-after="6mm"/>
    </xsl:template>

    <!-- A bold section heading with a short accent-colored underline, used inside a document body. -->
    <xsl:template name="section-title">
        <xsl:param name="text"/>
        <fo:block font-size="12pt" font-weight="bold" color="{$tafelInk}"
                  border-bottom="0.6mm solid {$tafelAccent}" padding-bottom="1mm" space-after="3mm">
            <xsl:value-of select="$text"/>
        </fo:block>
    </xsl:template>

    <!--
        A single labeled value: the value itself, then a thin accent rule, then a small muted
        label underneath. Shared between the ID card and the master data sheet, which both
        display the same kind of "one value, one label" fields.
    -->
    <xsl:template name="field-with-label">
        <xsl:param name="value"/>
        <xsl:param name="label"/>
        <fo:block font-size="11pt" color="{$tafelInk}" linefeed-treatment="preserve">
            <xsl:choose>
                <!--
                    A block with no content collapses to zero height in FOP, which pulls its
                    accent-rule "underline" up to sit right under the label above it instead of a
                    line below where a value would normally be - visible wherever several of these
                    fields sit side by side (e.g. an unsigned "Unterschrift" line, or a blank
                    print-and-fill template) and the neighboring fields do have a value. A
                    non-breaking space keeps the line's height without rendering anything.
                -->
                <xsl:when test="normalize-space($value) = ''">
                    <xsl:text>&#160;</xsl:text>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="$value"/>
                </xsl:otherwise>
            </xsl:choose>
        </fo:block>
        <fo:block border-top="0.4mm solid {$tafelAccent}" margin-top="1mm">
            <fo:block font-size="7.5pt" font-weight="bold" color="{$tafelMuted}" margin-top="1mm">
                <xsl:value-of select="$label"/>
            </fo:block>
        </fo:block>
    </xsl:template>

    <!--
        A label/value row with a hairline underneath and a bold, right-aligned value - used for
        the at-a-glance figures on the daily report and the master data sheet's validity footer.
    -->
    <xsl:template name="stat-row">
        <xsl:param name="label"/>
        <xsl:param name="value"/>
        <fo:table table-layout="fixed" width="100%" border-bottom="0.25mm solid {$tafelHairline}">
            <fo:table-column column-width="65%"/>
            <fo:table-column column-width="35%"/>
            <fo:table-body>
                <fo:table-row>
                    <fo:table-cell padding-top="1mm" padding-bottom="1mm">
                        <fo:block color="{$tafelInk}">
                            <xsl:value-of select="$label"/>
                        </fo:block>
                    </fo:table-cell>
                    <fo:table-cell padding-top="1mm" padding-bottom="1mm" text-align="right">
                        <fo:block font-weight="bold" color="{$tafelInk}">
                            <xsl:value-of select="$value"/>
                        </fo:block>
                    </fo:table-cell>
                </fo:table-row>
            </fo:table-body>
        </fo:table>
    </xsl:template>

</xsl:stylesheet>
