package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.common.model.DistributionStateTransitionEvent
import guru.nidi.graphviz.attribute.Label
import guru.nidi.graphviz.attribute.Shape
import guru.nidi.graphviz.engine.Format
import guru.nidi.graphviz.engine.Graphviz
import guru.nidi.graphviz.model.Factory.mutGraph
import guru.nidi.graphviz.model.Factory.node
import guru.nidi.graphviz.model.Link
import guru.nidi.graphviz.model.Node
import jakarta.annotation.PostConstruct
import org.springframework.statemachine.StateMachine
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseBody
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/distributions")
class DistributionStateVisualizerService(
    private val stateMachine: StateMachine<DistributionState, DistributionStateTransitionEvent>
) {
    private lateinit var graphviz: Graphviz

    @PostConstruct
    fun init() {
        val graph = mutGraph("Distributions State Machine").setDirected(true)
        val graphMap = mutableMapOf<String, MutableSet<GraphVizLink>>()

        stateMachine.states.forEach { s -> graphMap[s.id.name] = mutableSetOf() }

        stateMachine.transitions.forEach { t ->
            graphMap[t.source.id.name]?.add(GraphVizLink(target = t.target.id.name, label = t.trigger.event.name))
        }

        graphMap.forEach { (key, targetSet) ->

            val node: Node = node(key).with(Shape.RECTANGLE)
            targetSet.forEach { l ->
                val targetNode = node(l.target)
                val label = Label.of(l.label.lowercase())

                graph.add(
                    node.link(
                        Link.to(targetNode).with(label)
                    )
                )
            }

        }

        graphviz = Graphviz.fromGraph(graph)
    }

    @ResponseBody
    @GetMapping(value = ["/states/visualize"], produces = ["image/svg+xml"])
    fun renderSVG(): String {
        return graphviz.render(Format.SVG).toString()
    }

}

data class GraphVizLink(
    val target: String,
    val label: String
)
